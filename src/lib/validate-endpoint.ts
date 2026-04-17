import type { Endpoint, GenerationScope, IdePromptScope } from "@/types/api";

export function isEndpoint(v: unknown): v is Endpoint {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.method === "string" &&
    typeof o.path === "string"
  );
}

export function isEndpointArray(v: unknown): v is Endpoint[] {
  return Array.isArray(v) && v.every(isEndpoint);
}

export function isGenerationScope(v: unknown): v is GenerationScope {
  return v === "endpoint" || v === "collection" || v === "api";
}

export function isIdePromptScope(v: unknown): v is IdePromptScope {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const scope = o.scope ?? o.level;
  if (scope !== "endpoint" && scope !== "collection" && scope !== "api") {
    return false;
  }
  if (!isEndpointArray(o.operations)) return false;
  return true;
}
