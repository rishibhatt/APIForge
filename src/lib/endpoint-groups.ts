import type { Endpoint } from "@/types/api";
import type { GenerationScope } from "@/types/api";

export function primaryTag(ep: Endpoint): string | null {
  const t = ep.tags?.[0];
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

export function endpointsSharingTag(
  endpoints: Endpoint[],
  tag: string,
): Endpoint[] {
  return endpoints.filter((e) => e.tags?.includes(tag));
}

/**
 * Endpoints included for the current generation scope.
 * - `api`: all operations (no active selection required).
 * - `collection`: same first tag as active, or first endpoint's tag; no tag → single endpoint.
 * - `endpoint`: active only, or first endpoint if none selected.
 */
export function getScopedEndpoints(
  endpoints: Endpoint[],
  activeEndpoint: Endpoint | null,
  scope: GenerationScope,
): Endpoint[] {
  if (endpoints.length === 0) return [];
  if (scope === "api") return endpoints;

  const fallback = endpoints[0]!;
  if (scope === "endpoint") {
    if (activeEndpoint) return [activeEndpoint];
    return [fallback];
  }

  // collection
  const tagSource = activeEndpoint ?? fallback;
  const tag = primaryTag(tagSource);
  if (!tag) return [tagSource];
  return endpointsSharingTag(endpoints, tag);
}

/** UI + prompt line for the current scope (logic only). */
export function getScopeLabel(
  endpoints: Endpoint[],
  activeEndpoint: Endpoint | null,
  scope: GenerationScope,
  scoped: Endpoint[],
): string {
  if (scoped.length === 0) return "";
  if (scope === "endpoint") {
    const ep = scoped[0]!;
    return `${ep.method} ${ep.path}`;
  }
  if (scope === "collection") {
    const tagSource = activeEndpoint ?? endpoints[0]!;
    const tag = primaryTag(tagSource);
    if (!tag) {
      const ep = scoped[0]!;
      return `${ep.method} ${ep.path}`;
    }
    return `${tag} (${scoped.length} endpoints)`;
  }
  return `Full API (${scoped.length} endpoints)`;
}

/** @deprecated Prefer `getScopedEndpoints` */
export function resolveEndpointsForLevel(
  endpoints: Endpoint[],
  active: Endpoint | null,
  level: GenerationScope,
): Endpoint[] {
  return getScopedEndpoints(endpoints, active, level);
}

/** @deprecated Prefer `getScopeLabel` with a scoped list */
export function levelHeading(
  endpoints: Endpoint[],
  active: Endpoint | null,
  level: GenerationScope,
): string {
  const scoped = getScopedEndpoints(endpoints, active, level);
  return getScopeLabel(endpoints, active, level, scoped);
}
