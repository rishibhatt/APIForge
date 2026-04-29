import type { Endpoint } from "@/types/api";

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
]);

/** Extract operations from a dereferenced OpenAPI / Swagger document */
export function extractEndpointsFromSpec(doc: Record<string, unknown>): Endpoint[] {
  const paths = (doc.paths ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const globalSecurity = doc.security;
  const list: Endpoint[] = [];

  for (const path of Object.keys(paths)) {
    const item = paths[path];
    if (!item || typeof item !== "object") continue;
    for (const key of Object.keys(item)) {
      const lower = key.toLowerCase();
      if (!HTTP_METHODS.has(lower)) continue;
      const op = item[key] as Record<string, unknown> | undefined;
      if (!op || typeof op !== "object") continue;
      const id = `${lower}:${path}`;
      list.push({
        id,
        method: lower.toUpperCase(),
        path,
        summary: typeof op.summary === "string" ? op.summary : undefined,
        description:
          typeof op.description === "string" ? op.description : undefined,
        tags: Array.isArray(op.tags)
          ? op.tags.filter((t): t is string => typeof t === "string")
          : undefined,
        requestBody: op.requestBody,
        responses: op.responses,
        parameters: op.parameters,
        security:
          op.security !== undefined ? op.security : globalSecurity,
      });
    }
  }

  list.sort(
    (a, b) =>
      a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  );
  return list;
}

/** One group per first tag (or "default") so each endpoint appears once */
export function groupEndpointsByTag(
  endpoints: Endpoint[],
): Map<string, Endpoint[]> {
  const map = new Map<string, Endpoint[]>();
  for (const ep of endpoints) {
    const raw = ep.tags?.[0]?.trim();
    const key = raw && raw.length > 0 ? raw : "default";
    const arr = map.get(key) ?? [];
    arr.push(ep);
    map.set(key, arr);
  }
  return map;
}
