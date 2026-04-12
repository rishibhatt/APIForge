import "server-only";

import SwaggerParser from "@apidevtools/swagger-parser";
import yaml from "js-yaml";
import type { ParseSwaggerResult } from "@/types/api";
import { extractEndpointsFromSpec } from "@/lib/extract-endpoints";
import { specUrlCandidates } from "@/lib/spec-url";

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

async function fetchSpecFromSwaggerUiPage(
  pageUrl: string,
): Promise<Record<string, unknown> | null> {
  let res: Response;
  try {
    res = await fetch(pageUrl, { redirect: "follow" });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") ?? "";
  const html = await res.text();
  const looksHtml =
    ct.includes("text/html") || /^\s*</.test(html);
  if (!looksHtml) return null;
  if (
    !/swagger-ui-init\.js/i.test(html) &&
    !/id=["']swagger-ui["']/i.test(html)
  ) {
    return null;
  }
  const m = html.match(
    /<script[^>]*\ssrc=["']([^"']*swagger-ui-init\.js[^"']*)["']/i,
  );
  if (!m?.[1]) return null;
  let initUrl: string;
  try {
    initUrl = new URL(m[1], pageUrl).href;
  } catch {
    return null;
  }
  let initRes: Response;
  try {
    initRes = await fetch(initUrl);
  } catch {
    return null;
  }
  if (!initRes.ok) return null;
  const js = await initRes.text();
  return extractSwaggerDocFromInitJs(js);
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

/** Server-side: validate, dereference, extract endpoints from URL */
export async function parseSwaggerUrl(url: string): Promise<ParseSwaggerResult> {
  const candidates = specUrlCandidates(url);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const dereferenced = (await SwaggerParser.validate(
        candidate,
      )) as unknown as Record<string, unknown>;
      const endpoints = extractEndpointsFromSpec(dereferenced);
      const info = dereferenced.info as
        | { title?: string; version?: string }
        | undefined;
      return {
        endpoints,
        title: info?.title,
        version: info?.version,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const embedded = await fetchSpecFromSwaggerUiPage(candidate);
      if (embedded) {
        try {
          const dereferenced = (await SwaggerParser.validate(
            embedded as never,
          )) as unknown as Record<string, unknown>;
          const endpoints = extractEndpointsFromSpec(dereferenced);
          const info = dereferenced.info as
            | { title?: string; version?: string }
            | undefined;
          return {
            endpoints,
            title: info?.title,
            version: info?.version,
          };
        } catch (e2) {
          lastError = e2 instanceof Error ? e2 : new Error(String(e2));
        }
      }
    }
  }

  const hint =
    candidates.length > 1
      ? " If you pasted a Swagger UI page (…/docs/, …/index.html), try the raw OpenAPI JSON/YAML URL if import still fails (e.g. …/swagger/v1/swagger.json)."
      : "";
  throw new Error(
    `${lastError?.message ?? "Parse failed"}.${hint}`.trim(),
  );
}

/** Parse uploaded file contents (JSON or YAML) */
export async function parseSwaggerFile(file: File): Promise<ParseSwaggerResult> {
  const text = await file.text();
  const obj = parseTextToObject(text);
  const dereferenced = (await SwaggerParser.validate(
    obj as never,
  )) as unknown as Record<string, unknown>;
  const endpoints = extractEndpointsFromSpec(dereferenced);
  const info = dereferenced.info as
    | { title?: string; version?: string }
    | undefined;
  return {
    endpoints,
    title: info?.title,
    version: info?.version,
  };
}
