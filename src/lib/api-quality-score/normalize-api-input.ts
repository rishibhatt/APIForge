import { extractEndpointsFromSpec } from "@/lib/extract-endpoints";
import type { Endpoint } from "@/types/api";
import type { NormalizedEndpoint } from "./types";

const METHOD_LINE_RE =
  /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)$/i;

function joinDescription(ep: Endpoint): string {
  const parts = [ep.summary, ep.description].filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0,
  );
  return parts.join(" — ") || "";
}

/** Map parsed workspace endpoints to scoring rows. */
export function normalizeFromEndpoints(endpoints: Endpoint[]): NormalizedEndpoint[] {
  return endpoints.map((e) => ({
    path: e.path,
    method: e.method.toUpperCase(),
    description: joinDescription(e),
    requestBody: e.requestBody,
    responses: e.responses,
  }));
}

/** Parse lines like `GET /api/v1/users` into normalized endpoints. */
export function normalizeFromRawLines(text: string): NormalizedEndpoint[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: NormalizedEndpoint[] = [];
  for (const line of lines) {
    const m = line.match(METHOD_LINE_RE);
    if (!m) continue;
    out.push({
      path: m[2]!,
      method: m[1]!.toUpperCase(),
      description: "",
    });
  }
  return out;
}

/**
 * Accept OpenAPI/Swagger JSON object (dereferenced or not — same as workspace parser output paths).
 */
export function normalizeFromOpenApiDoc(
  doc: Record<string, unknown>,
): NormalizedEndpoint[] {
  const endpoints = extractEndpointsFromSpec(doc);
  return normalizeFromEndpoints(endpoints);
}
