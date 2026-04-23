import type { Endpoint } from "@/types/api";

/** Plain JSON-serializable copy for API routes (avoids non-JSON values breaking `fetch` bodies). */
export function endpointToJsonSafe(ep: Endpoint): Endpoint {
  return {
    id: String(ep.id),
    method: String(ep.method),
    path: String(ep.path),
    ...(ep.summary != null ? { summary: String(ep.summary) } : {}),
    ...(Array.isArray(ep.tags) ? { tags: ep.tags.map(String) } : {}),
    ...(ep.requestBody !== undefined ? { requestBody: ep.requestBody } : {}),
    ...(ep.responses !== undefined ? { responses: ep.responses } : {}),
    ...(ep.parameters !== undefined ? { parameters: ep.parameters } : {}),
    ...(ep.security !== undefined ? { security: ep.security } : {}),
  };
}

export function endpointsToJsonSafe(list: Endpoint[]): Endpoint[] {
  return list.map(endpointToJsonSafe);
}
