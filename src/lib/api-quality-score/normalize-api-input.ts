import type { Endpoint } from "@/types/api";
import type { NormalizedEndpoint } from "./types";

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
