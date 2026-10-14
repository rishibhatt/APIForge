import "server-only";

import SwaggerParser from "@apidevtools/swagger-parser";
import yaml from "js-yaml";
import type { ParseSwaggerResult, SpecChoice } from "@/types/api";
import { extractEndpointsFromSpec } from "@/lib/extract-endpoints";
import { extractServerUrls } from "@/lib/extract-servers";
import { sanitizeAndStubMissingRefs } from "@/lib/sanitize-refs";
import {
  extractEmbeddedSwaggerDoc,
  guessSpecUrls,
  looksLikeHtml,
  looksLikeSwaggerUiPage,
  scanSwaggerUiSource,
  specsFromSwaggerConfigJson,
  type DiscoveredSpec,
} from "@/lib/swagger-ui-discovery";
import type { IpValidationOptions } from "@/lib/security/ip-validation";
import {
  SafeFetchError,
  safeFetchText,
  type SafeFetchResult,
} from "@/lib/security/safe-fetch";
import type { SpecFetchHeaders } from "@/lib/security/spec-fetch-headers";
import { getProxySecurityOptions } from "@/lib/proxy-execution";

export interface ParseSwaggerOptions {
  /** SSRF policy for every outbound fetch (spec, Swagger UI assets, external $refs). */
  security?: IpValidationOptions;
  /**
   * User-supplied auth headers. Sent only to the origin of the pasted URL, never to other hosts
   * a docs page or a `$ref` points at.
   */
  headers?: SpecFetchHeaders;
}

/** Caps so a hostile docs page cannot fan out into many fetches. */
const MAX_PAGE_SCRIPTS = 4;
const MAX_CONFIG_URLS = 3;
const MAX_DISCOVERED_SPECS = 8;
const GUESS_BATCH = 4;

const FETCH_HEADERS = {
  Accept: "application/json, application/yaml, text/yaml, text/plain, text/html, */*",
  // Free ngrok tunnels answer browser-like clients with an interstitial page instead of the app.
  "ngrok-skip-browser-warning": "1",
};

/** Per-call fetch context: SSRF policy plus credentials scoped to the pasted URL's origin. */
interface FetchContext {
  security: IpValidationOptions;
  credentialOrigin: string;
  credentials: SpecFetchHeaders;
  /** Status codes that meant "log in first" (401/403), for the final error message. */
  authStatuses: number[];
}

function credentialsFor(ctx: FetchContext, url: string): SpecFetchHeaders | undefined {
  try {
    return new URL(url).origin === ctx.credentialOrigin ? ctx.credentials : undefined;
  } catch {
    return undefined;
  }
}

async function guardedGet(url: string, ctx: FetchContext): Promise<SafeFetchResult> {
  return safeFetchText(url, {
    security: ctx.security,
    headers: FETCH_HEADERS,
    credentialHeaders: credentialsFor(ctx, url),
  });
}

/**
 * Lenient mode: resolve $refs like Swagger UI without strict OAS schema checks and ignore circular refs.
 * The built-in `file` resolver is disabled (a `$ref: "../.env"` would read server files) and the built-in
 * `http` resolver is replaced with one that runs every hop through the SSRF guard.
 */
function relaxedOptions(ctx: FetchContext): SwaggerParser.Options {
  return {
    validate: { schema: false, spec: false },
    dereference: { circular: "ignore" },
    resolve: {
      file: false,
      http: false,
      guardedHttp: {
        order: 1,
        canRead: /^https?:\/\//i,
        read: async (file: { url: string }) => {
          const res = await guardedGet(file.url, ctx);
          if (!res.ok) throw new Error(`HTTP ${res.status} while resolving ${file.url}`);
          return res.text;
        },
      },
    },
  };
}

/** `baseUrl` lets relative external `$ref`s (./schemas.yaml) resolve next to the spec. */
async function normalizeDocObject(
  docObj: Record<string, unknown>,
  ctx: FetchContext,
  baseUrl?: string,
): Promise<Record<string, unknown>> {
  const stubbedDoc = sanitizeAndStubMissingRefs(docObj);
  const RELAXED = relaxedOptions(ctx);
  const run = (fn: "validate" | "dereference") =>
    (baseUrl
      ? SwaggerParser[fn](baseUrl, stubbedDoc as never, RELAXED)
      : SwaggerParser[fn](stubbedDoc as never, RELAXED)) as unknown as Promise<Record<string, unknown>>;

  try {
    return await run("validate");
  } catch {
    try {
      return await run("dereference");
    } catch {
      return stubbedDoc;
    }
  }
}

function extractSecuritySchemes(
  doc: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const comp = doc.components;
  if (comp && typeof comp === "object") {
    const raw = (comp as { securitySchemes?: unknown }).securitySchemes;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
  }
  const legacy = doc.securityDefinitions;
  if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
    return legacy as Record<string, unknown>;
  }
  return undefined;
}

function resultFromDoc(
  doc: Record<string, unknown>,
): ParseSwaggerResult {
  const endpoints = extractEndpointsFromSpec(doc);
  const info = doc.info as
    | { title?: string; version?: string }
    | undefined;
  const serverUrls = extractServerUrls(doc);
  const securitySchemes = extractSecuritySchemes(doc);
  return {
    endpoints,
    title: info?.title,
    version: info?.version,
    serverUrls: serverUrls.length ? serverUrls : undefined,
    ...(securitySchemes ? { securitySchemes } : {}),
  };
}

function parseTextToObject(text: string): Record<string, unknown> {
  const trimmed = text.replace(/^﻿/, "").trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as Record<string, unknown>;
  }
  const loaded = yaml.load(trimmed);
  if (!loaded || typeof loaded !== "object") {
    throw new Error("Invalid OpenAPI document");
  }
  return loaded as Record<string, unknown>;
}

function isSpecObject(o: Record<string, unknown>): boolean {
  return typeof o.openapi === "string" || typeof o.swagger === "string" || (!!o.paths && typeof o.paths === "object");
}

/** Why one candidate URL did not give a spec. Used for the final error message. */
type Miss = { url: string; reason: string };

type Attempt =
  | { kind: "spec"; result: ParseSwaggerResult }
  | { kind: "html"; res: SafeFetchResult }
  | { kind: "miss"; miss: Miss };

/** Fetches one URL and returns a parsed spec, the HTML page it served, or why it failed. */
async function attemptSpec(url: string, ctx: FetchContext, guess = false): Promise<Attempt> {
  let res: SafeFetchResult;
  try {
    res = await guardedGet(url, ctx);
  } catch (e) {
    if (e instanceof SafeFetchError) throw e;
    return { kind: "miss", miss: { url, reason: e instanceof Error ? e.message : String(e) } };
  }
  // A guessed path that answers 403 is often just "no such file" (S3, some CDNs); only 401 there means auth.
  if (res.status === 401 || (res.status === 403 && !guess)) ctx.authStatuses.push(res.status);
  if (!res.ok) return { kind: "miss", miss: { url, reason: `HTTP ${res.status}` } };

  const embedded = extractEmbeddedSwaggerDoc(res.text);
  if (embedded) {
    const result = resultFromDoc(await normalizeDocObject(embedded, ctx));
    if (result.endpoints.length > 0) return { kind: "spec", result };
  }

  if (looksLikeHtml(res.contentType, res.text)) return { kind: "html", res };

  let docObj: Record<string, unknown>;
  try {
    docObj = parseTextToObject(res.text);
  } catch {
    return { kind: "miss", miss: { url, reason: "response is not JSON or YAML" } };
  }
  if (!isSpecObject(docObj)) {
    return { kind: "miss", miss: { url, reason: "JSON has no openapi, swagger or paths field" } };
  }
  const result = resultFromDoc(await normalizeDocObject(docObj, ctx, res.url || url));
  if (result.endpoints.length === 0) {
    return { kind: "miss", miss: { url, reason: "no operations under paths" } };
  }
  return { kind: "spec", result };
}

/** Swagger UI page: the specs it names and an embedded document, if any. */
async function discoverFromDocsPage(
  page: SafeFetchResult,
  ctx: FetchContext,
): Promise<{ specs: DiscoveredSpec[]; embedded: Record<string, unknown> | null }> {
  const pageHref = page.url;
  const scan = scanSwaggerUiSource(page.text, pageHref);
  const specs = [...scan.specs];
  const configUrls = [...scan.configUrls];
  let embedded: Record<string, unknown> | null = null;

  for (const scriptUrl of scan.scriptUrls.slice(0, MAX_PAGE_SCRIPTS)) {
    let js: SafeFetchResult;
    try {
      js = await guardedGet(scriptUrl, ctx);
    } catch {
      continue;
    }
    if (!js.ok) continue;
    embedded ??= extractEmbeddedSwaggerDoc(js.text);
    const fromJs = scanSwaggerUiSource(js.text, pageHref);
    specs.push(...fromJs.specs);
    configUrls.push(...fromJs.configUrls);
  }

  for (const configUrl of Array.from(new Set(configUrls)).slice(0, MAX_CONFIG_URLS)) {
    try {
      const cfg = await guardedGet(configUrl, ctx);
      if (cfg.ok) specs.push(...specsFromSwaggerConfigJson(cfg.text, cfg.url || configUrl));
    } catch {
      /* config missing: guesses below may still find the spec */
    }
  }

  const seen = new Set<string>();
  const unique = specs.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
  return { specs: unique.slice(0, MAX_DISCOVERED_SPECS), embedded };
}

function withChoices(
  result: ParseSwaggerResult,
  specUrl: string | undefined,
  choices: DiscoveredSpec[],
): ParseSwaggerResult {
  const out: ParseSwaggerResult = { ...result };
  if (specUrl) out.specUrl = specUrl;
  if (choices.length > 1) out.availableSpecs = choices.map((c): SpecChoice => ({ url: c.url, name: c.name }));
  return out;
}

function failureMessage(
  ctx: FetchContext,
  pastedUrl: string,
  sawDocsPage: boolean,
  discovered: DiscoveredSpec[],
  misses: Miss[],
): string {
  if (ctx.authStatuses.length > 0) {
    const status = ctx.authStatuses[0];
    const hasCreds = Object.keys(ctx.credentials).length > 0;
    return hasCreds
      ? `HTTP ${status}: the server rejected the auth header you added. Check the header name and value.`
      : `HTTP ${status}: this spec needs authentication. Add an auth header (for example Authorization: Bearer <token>) and try again.`;
  }
  if (discovered.length > 0) {
    const first = misses.find((m) => m.url === discovered[0]!.url);
    return `Found the Swagger UI page, but its spec at ${discovered[0]!.url} could not be loaded${first ? ` (${first.reason})` : ""}.`;
  }
  if (sawDocsPage) {
    return "Found a Swagger UI page, but could not find which spec it loads. Paste the raw spec link (openapi.json or swagger.json) instead.";
  }
  const pastedMiss = misses.find((m) => m.url === pastedUrl);
  if (pastedMiss && /^HTTP \d+$/.test(pastedMiss.reason)) return `${pastedMiss.reason} from ${pastedUrl}`;
  return "This URL returned a web page with no Swagger UI and no spec link. Paste the raw OpenAPI JSON/YAML URL instead.";
}

/** Server-side: find the spec behind a URL (raw spec, Swagger UI page or docs path), parse it. */
export async function parseSwaggerUrl(
  url: string,
  options: ParseSwaggerOptions = {},
): Promise<ParseSwaggerResult> {
  const pastedUrl = url.trim();
  const ctx: FetchContext = {
    security: options.security ?? getProxySecurityOptions(),
    credentialOrigin: new URL(pastedUrl).origin,
    credentials: options.headers ?? {},
    authStatuses: [],
  };
  const misses: Miss[] = [];
  const tried = new Set<string>();

  // 1. The pasted URL: a raw spec, or a docs page that names its spec.
  tried.add(pastedUrl);
  const first = await attemptSpec(pastedUrl, ctx);
  if (first.kind === "spec") return withChoices(first.result, pastedUrl, []);
  if (first.kind === "miss") misses.push(first.miss);

  let discovered: DiscoveredSpec[] = [];
  let sawDocsPage = false;
  if (first.kind === "html" && looksLikeSwaggerUiPage(first.res.text)) {
    sawDocsPage = true;
    const found = await discoverFromDocsPage(first.res, ctx);
    discovered = found.specs;
    if (found.embedded) {
      const result = resultFromDoc(await normalizeDocObject(found.embedded, ctx));
      if (result.endpoints.length > 0) return withChoices(result, undefined, discovered);
    }
    // 2. Specs the page names, in the order Swagger UI would open them.
    for (const spec of discovered) {
      if (tried.has(spec.url)) continue;
      tried.add(spec.url);
      let attempt: Attempt;
      try {
        attempt = await attemptSpec(spec.url, ctx);
      } catch (e) {
        // A blocked or unreachable spec host should not hide the other specs the page lists.
        misses.push({ url: spec.url, reason: e instanceof Error ? e.message : String(e) });
        continue;
      }
      if (attempt.kind === "spec") return withChoices(attempt.result, spec.url, discovered);
      misses.push(attempt.kind === "miss" ? attempt.miss : { url: spec.url, reason: "returned a web page" });
    }
  }

  // 3. Framework default paths next to the docs page, a few at a time, nearest first.
  const guesses = guessSpecUrls(pastedUrl).filter((g) => !tried.has(g));
  for (let i = 0; i < guesses.length; i += GUESS_BATCH) {
    const batch = guesses.slice(i, i + GUESS_BATCH);
    const results = await Promise.all(
      batch.map((g) => attemptSpec(g, ctx, true).catch((): Attempt => ({ kind: "miss", miss: { url: g, reason: "blocked" } }))),
    );
    for (let j = 0; j < batch.length; j++) {
      const r = results[j]!;
      if (r.kind === "spec") return withChoices(r.result, batch[j], discovered);
    }
  }

  throw new Error(failureMessage(ctx, pastedUrl, sawDocsPage, discovered, misses));
}

/** Parse uploaded file contents (JSON or YAML) */
export async function parseSwaggerFile(
  file: File,
  options: ParseSwaggerOptions = {},
): Promise<ParseSwaggerResult> {
  const text = await file.text();
  const obj = parseTextToObject(text);
  const ctx: FetchContext = {
    security: options.security ?? getProxySecurityOptions(),
    credentialOrigin: "",
    credentials: {},
    authStatuses: [],
  };
  const doc = await normalizeDocObject(obj, ctx);
  return resultFromDoc(doc);
}
