import "server-only";

import SwaggerParser from "@apidevtools/swagger-parser";
import yaml from "js-yaml";
import type { ParseSwaggerResult } from "@/types/api";
import { extractEndpointsFromSpec } from "@/lib/extract-endpoints";
import { specUrlCandidates } from "@/lib/spec-url";

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
    }
  }

  const hint =
    candidates.length > 1
      ? " If you used a Swagger UI link (e.g. …/index.html), use the raw OpenAPI URL (often …/swagger/v1/swagger.json)."
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
