import "server-only";

import SwaggerParser from "@apidevtools/swagger-parser";
import yaml from "js-yaml";
import type { ParseSwaggerResult } from "@/types/api";
import { extractEndpointsFromSpec } from "@/lib/extract-endpoints";
import { extractServerUrls } from "@/lib/extract-servers";
import { specUrlCandidates } from "@/lib/spec-url";
import { sanitizeAndStubMissingRefs } from "@/lib/sanitize-refs";
import type { IpValidationOptions } from "@/lib/security/ip-validation";
import {
  SafeFetchError,
  safeFetchText,
  type SafeFetchResult,
} from "@/lib/security/safe-fetch";
import { getProxySecurityOptions } from "@/lib/proxy-execution";

export interface ParseSwaggerOptions {
  /** SSRF policy for every outbound fetch (spec, Swagger UI assets, external $refs). */
  security?: IpValidationOptions;
}

const MAX_URL_CANDIDATES = 12;

const FETCH_HEADERS = { Accept: "application/json, text/plain, text/html, */*" };

/**
 * Lenient mode: resolve $refs like Swagger UI without strict OAS schema checks and ignore circular refs.
 * The built-in `file` resolver is disabled (a `$ref: "../.env"` would read server files) and the built-in
 * `http` resolver is replaced with one that runs every hop through the SSRF guard.
 */
function relaxedOptions(security: IpValidationOptions): SwaggerParser.Options {
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
          const res = await safeFetchText(file.url, { security, headers: FETCH_HEADERS });
          if (!res.ok) throw new Error(`HTTP ${res.status} while resolving ${file.url}`);
          return res.text;
        },
      },
    },
  };
}

async function guardedGet(
  url: string,
  security: IpValidationOptions,
): Promise<SafeFetchResult> {
  return safeFetchText(url, { security, headers: FETCH_HEADERS });
}

async function normalizeDocObject(
  docObj: Record<string, unknown>,
  security: IpValidationOptions,
): Promise<Record<string, unknown>> {
  const stubbedDoc = sanitizeAndStubMissingRefs(docObj);
  const RELAXED = relaxedOptions(security);

  try {
    return (await SwaggerParser.validate(stubbedDoc as never, RELAXED)) as unknown as Record<
      string,
      unknown
    >;
  } catch {
    try {
      return (await SwaggerParser.dereference(stubbedDoc as never, RELAXED)) as unknown as Record<
        string,
        unknown
      >;
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

/**
 * NestJS / many Swagger UI builds embed the spec in swagger-ui-init.js as
 * `var options = { "swaggerDoc": { ... } }`.
 */
function extractSwaggerDocFromInitJs(js: string): Record<string, unknown> | null {
  const key = '"swaggerDoc":';
  const i = js.indexOf(key);
  if (i === -1) return null;
  let pos = i + key.length;
  while (pos < js.length && /\s/.test(js[pos]!)) pos++;
  if (js[pos] !== "{") return null;
  const start = pos;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let p = start; p < js.length; p++) {
    const c = js[p]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(js.slice(start, p + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Resolve relative Swagger UI `url` the same way as common inline templates */
function resolveSwaggerUiConfigUrl(pageHref: string, specPath: string): string {
  const p = specPath.trim();
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("/")) return new URL(p, pageHref).href;
  if (pageHref.includes("index.html")) {
    return pageHref.replace(/index\.html/i, p).split("#")[0]!;
  }
  return new URL(p, pageHref).href;
}

function extractUrlsFromSwaggerConfigJson(
  raw: string,
  pageHref: string,
): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const out: string[] = [];
  if (!parsed || typeof parsed !== "object") return out;
  const o = parsed as Record<string, unknown>;
  if (typeof o.url === "string") {
    out.push(resolveSwaggerUiConfigUrl(pageHref, o.url));
  }
  if (Array.isArray(o.urls)) {
    for (const item of o.urls) {
      if (item && typeof item === "object" && typeof (item as { url?: string }).url === "string") {
        out.push(
          resolveSwaggerUiConfigUrl(pageHref, (item as { url: string }).url),
        );
      }
    }
  }
  return out;
}

/** `JSON.parse('...')` args in inline scripts (single-quoted string) */
function extractJsonParseSingleQuotedArgs(html: string): string[] {
  const args: string[] = [];
  const needle = "JSON.parse('";
  let from = 0;
  while (from < html.length) {
    const i = html.indexOf(needle, from);
    if (i === -1) break;
    let pos = i + needle.length;
    let raw = "";
    while (pos < html.length) {
      const c = html[pos]!;
      if (c === "\\") {
        pos++;
        if (pos < html.length) {
          raw += html[pos]!;
          pos++;
        }
        continue;
      }
      if (c === "'") {
        args.push(raw);
        from = pos + 1;
        break;
      }
      raw += c;
      pos++;
    }
    if (pos >= html.length) break;
  }
  return args;
}

function parseOssServicesFromInitializer(js: string): Array<[string, string]> {
  const m = js.match(/ossServices\s*=\s*`([^`]*)`/);
  if (!m?.[1]) return [];
  return m[1]
    .split(",")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) return null;
      return [pair.slice(0, eq).trim(), pair.slice(eq + 1).trim()] as [
        string,
        string,
      ];
    })
    .filter((x): x is [string, string] => x !== null && x[0].length > 0);
}

function definitionUrlFromInitializerJs(
  js: string,
  pageHost: string,
): string | null {
  const defM = js.match(/defaultDefinitionUrl\s*=\s*"([^"]*)"/);
  const defaultUrl = defM?.[1] ?? null;
  const tuples = parseOssServicesFromInitializer(js);
  const match = tuples.find(([host]) => pageHost.includes(host));
  if (match) return match[1];
  return defaultUrl;
}

function scriptSrcsMatching(html: string, basename: string): string[] {
  const re = new RegExp(
    `<script[^>]*\\ssrc=["']([^"']*${basename}[^"']*)["']`,
    "gi",
  );
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

type SwaggerUiRecovery = {
  embedded: Record<string, unknown> | null;
  extraUrls: string[];
};

/** One HTML fetch: embedded NestJS spec + discovered raw spec URLs */
async function recoverFromSwaggerUiPage(
  pageUrl: string,
  security: IpValidationOptions,
): Promise<SwaggerUiRecovery | null> {
  let res: SafeFetchResult;
  try {
    res = await guardedGet(pageUrl, security);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const ct = res.contentType;
  const html = res.text;
  const looksHtml = ct.includes("text/html") || /^\s*</.test(html);
  if (!looksHtml) return null;
  if (
    !/swagger-ui-init\.js/i.test(html) &&
    !/swagger-initializer\.js/i.test(html) &&
    !/id=["']swagger-ui["']/i.test(html)
  ) {
    return null;
  }

  const extraUrls: string[] = [];
  const pageHref = res.url || pageUrl;
  const pageHost = new URL(pageHref).host;

  for (const arg of extractJsonParseSingleQuotedArgs(html)) {
    for (const u of extractUrlsFromSwaggerConfigJson(arg, pageHref)) {
      extraUrls.push(u);
    }
  }

  const initJsPaths = [
    ...scriptSrcsMatching(html, "swagger-ui-init\\.js"),
    ...scriptSrcsMatching(html, "swagger-initializer\\.js"),
  ];

  let embedded: Record<string, unknown> | null = null;

  for (const src of initJsPaths) {
    let initUrl: string;
    try {
      initUrl = new URL(src, pageHref).href;
    } catch {
      continue;
    }
    let initRes: SafeFetchResult;
    try {
      initRes = await guardedGet(initUrl, security);
    } catch {
      continue;
    }
    if (!initRes.ok) continue;
    const js = initRes.text;

    if (/swagger-ui-init\.js/i.test(src)) {
      embedded = extractSwaggerDocFromInitJs(js);
    }

    if (/swagger-initializer\.js/i.test(src)) {
      const fromOss = definitionUrlFromInitializerJs(js, pageHost);
      if (fromOss) extraUrls.push(fromOss);
      const urlLit = js.match(/\burl:\s*"([^"]+)"/);
      if (urlLit?.[1]) extraUrls.push(urlLit[1]);
    }
  }

  return { embedded, extraUrls };
}

function parseTextToObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as Record<string, unknown>;
  }
  const loaded = yaml.load(trimmed);
  if (!loaded || typeof loaded !== "object") {
    throw new Error("Invalid OpenAPI document");
  }
  return loaded as Record<string, unknown>;
}

async function fetchAndNormalizeCandidate(
  candidate: string,
  security: IpValidationOptions,
): Promise<Record<string, unknown> | null> {
  // SafeFetchError (blocked destination, timeout, too large) propagates so the caller can report it.
  const res = await guardedGet(candidate, security);
  if (!res.ok) return null;

  const ct = res.contentType;
  const text = res.text;

  const embeddedDoc = extractSwaggerDocFromInitJs(text);
  if (embeddedDoc) {
    return normalizeDocObject(embeddedDoc, security);
  }

  const isHtml = ct.includes("text/html") || /^\s*</.test(text);
  if (isHtml) {
    return null;
  }

  try {
    const docObj = parseTextToObject(text);
    return await normalizeDocObject(docObj, security);
  } catch {
    return null;
  }
}

/** Server-side: validate / dereference, extract endpoints from URL */
export async function parseSwaggerUrl(
  url: string,
  options: ParseSwaggerOptions = {},
): Promise<ParseSwaggerResult> {
  const security = options.security ?? getProxySecurityOptions();
  const RELAXED = relaxedOptions(security);
  const seeds = specUrlCandidates(url);
  const queue: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    const t = u.trim();
    // Cap discovered candidates so a hostile Swagger UI page cannot fan out into many fetches.
    if (!t || seen.has(t) || queue.length >= MAX_URL_CANDIDATES) return;
    seen.add(t);
    queue.push(t);
  };
  for (const s of seeds) push(s);

  let lastError: Error | null = null;

  for (let i = 0; i < queue.length; i++) {
    const candidate = queue[i]!;

    // 1. Fetch & parse direct JSON / YAML / JS spec
    try {
      const doc = await fetchAndNormalizeCandidate(candidate, security);
      if (doc) {
        const res = resultFromDoc(doc);
        if (res.endpoints.length > 0) return res;
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      // Blocked / timed out / too large: the other strategies would hit the same wall.
      if (e instanceof SafeFetchError) continue;
    }

    // 2. Recover embedded spec from Swagger UI HTML page
    try {
      const recovery = await recoverFromSwaggerUiPage(candidate, security);
      if (recovery) {
        for (const u of recovery.extraUrls) push(u);

        if (recovery.embedded) {
          const doc = await normalizeDocObject(recovery.embedded, security);
          const res = resultFromDoc(doc);
          if (res.endpoints.length > 0) return res;
        }
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }

    // 3. Fallback to direct SwaggerParser URL dereference
    try {
      const deref = (await SwaggerParser.dereference(
        candidate,
        RELAXED,
      )) as unknown as Record<string, unknown>;
      const stubbed = sanitizeAndStubMissingRefs(deref);
      const res = resultFromDoc(stubbed);
      if (res.endpoints.length > 0) return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  const hint =
    queue.length > 1
      ? " If you pasted a Swagger UI page, try the raw OpenAPI JSON/YAML URL (e.g. …/v1/swagger.json or …/openapi.json)."
      : "";
  throw new Error(
    `${(lastError?.message ?? "Parse failed").replace(/\.+$/, "")}.${hint}`.trim(),
  );
}

/** Parse uploaded file contents (JSON or YAML) */
export async function parseSwaggerFile(
  file: File,
  options: ParseSwaggerOptions = {},
): Promise<ParseSwaggerResult> {
  const text = await file.text();
  const obj = parseTextToObject(text);
  const doc = await normalizeDocObject(obj, options.security ?? getProxySecurityOptions());
  return resultFromDoc(doc);
}
