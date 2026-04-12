import "server-only";

import SwaggerParser from "@apidevtools/swagger-parser";
import yaml from "js-yaml";
import type { ParseSwaggerResult } from "@/types/api";
import { extractEndpointsFromSpec } from "@/lib/extract-endpoints";
import { specUrlCandidates } from "@/lib/spec-url";

/** Lenient mode: resolve $refs like Swagger UI without strict OAS schema checks */
const RELAXED: SwaggerParser.Options = {
  validate: { schema: false, spec: false },
};

async function dereferenceSpec(
  api: string | Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return (await SwaggerParser.dereference(api as never, RELAXED)) as unknown as Record<
    string,
    unknown
  >;
}

/**
 * Try strict validation first; fall back to lenient dereference (invalid * securitySchemes, etc. still load in Swagger UI).
 */
async function normalizeSpec(
  api: string | Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    return (await SwaggerParser.validate(api as never)) as unknown as Record<
      string,
      unknown
    >;
  } catch {
    return dereferenceSpec(api);
  }
}

function resultFromDoc(
  doc: Record<string, unknown>,
): ParseSwaggerResult {
  const endpoints = extractEndpointsFromSpec(doc);
  const info = doc.info as
    | { title?: string; version?: string }
    | undefined;
  return {
    endpoints,
    title: info?.title,
    version: info?.version,
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
): Promise<SwaggerUiRecovery | null> {
  let res: Response;
  try {
    res = await fetch(pageUrl, { redirect: "follow" });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") ?? "";
  const html = await res.text();
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
    let initRes: Response;
    try {
      initRes = await fetch(initUrl);
    } catch {
      continue;
    }
    if (!initRes.ok) continue;
    const js = await initRes.text();

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

/** Server-side: validate / dereference, extract endpoints from URL */
export async function parseSwaggerUrl(url: string): Promise<ParseSwaggerResult> {
  const seeds = specUrlCandidates(url);
  const queue: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    const t = u.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    queue.push(t);
  };
  for (const s of seeds) push(s);

  let lastError: Error | null = null;

  for (let i = 0; i < queue.length; i++) {
    const candidate = queue[i]!;

    try {
      const doc = await normalizeSpec(candidate);
      return resultFromDoc(doc);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }

    const recovery = await recoverFromSwaggerUiPage(candidate);
    if (recovery) {
      for (const u of recovery.extraUrls) push(u);

      if (recovery.embedded) {
        try {
          const doc = await normalizeSpec(recovery.embedded);
          return resultFromDoc(doc);
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
        }
      }
    }
  }

  const hint =
    queue.length > 1
      ? " If you pasted a Swagger UI page, try the raw OpenAPI JSON/YAML URL (e.g. …/v1/swagger.json or …/openapi.json)."
      : "";
  throw new Error(
    `${lastError?.message ?? "Parse failed"}.${hint}`.trim(),
  );
}

/** Parse uploaded file contents (JSON or YAML) */
export async function parseSwaggerFile(file: File): Promise<ParseSwaggerResult> {
  const text = await file.text();
  const obj = parseTextToObject(text);
  const doc = await normalizeSpec(obj);
  return resultFromDoc(doc);
}
