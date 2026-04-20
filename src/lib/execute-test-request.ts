import type { Endpoint } from "@/types/api";

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function joinBaseAndPath(base: string, path: string): string {
  const b = base.trim().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!b) return p;
  return `${b}${p}`;
}

type ParamRow = { name: string; in: string; required?: boolean };

function paramRows(endpoint: Endpoint): ParamRow[] {
  const p = endpoint.parameters;
  if (!Array.isArray(p)) return [];
  const rows = p.map((item): ParamRow | null => {
    if (!isObject(item)) return null;
    const name = typeof item.name === "string" ? item.name : "";
    const inn = typeof item.in === "string" ? item.in : "";
    if (!name || !inn) return null;
    return {
      name,
      in: inn,
      required: item.required === true,
    };
  });
  return rows.filter((x): x is ParamRow => x !== null);
}

/**
 * Apply path and query params from a flat payload object; remainder is the JSON body.
 */
export function prepareRequestFromPayload(
  endpoint: Endpoint,
  payload: unknown,
): {
  urlPath: string;
  query: URLSearchParams;
  body: BodyInit | undefined;
  hasJsonBody: boolean;
} {
  const method = endpoint.method.toUpperCase();
  const wantsBody =
    method !== "GET" &&
    method !== "HEAD" &&
    endpoint.requestBody != null;

  const flat =
    payload != null && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : {};

  let urlPath = endpoint.path;
  const query = new URLSearchParams();
  const consumed = new Set<string>();

  for (const row of paramRows(endpoint)) {
    if (!(row.name in flat)) continue;
    const v = flat[row.name];
    if (v === undefined || v === null) continue;
    const s = typeof v === "string" ? v : JSON.stringify(v);
    if (row.in === "path") {
      urlPath = urlPath.replace(
        new RegExp(`\\{${escapeRe(row.name)}\\}`, "g"),
        encodeURIComponent(s),
      );
      consumed.add(row.name);
    } else if (row.in === "query") {
      query.set(row.name, s);
      consumed.add(row.name);
    }
  }

  if (!wantsBody) {
    return { urlPath, query, body: undefined, hasJsonBody: false };
  }

  const bodyObj: Record<string, unknown> = {};
  for (const k of Object.keys(flat)) {
    if (!consumed.has(k)) bodyObj[k] = flat[k]!;
  }

  return {
    urlPath,
    query,
    body: JSON.stringify(bodyObj),
    hasJsonBody: true,
  };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function statusExpectationMet(
  actual: number,
  expected: number,
  type: "valid" | "invalid" | "edge",
): boolean {
  if (actual === expected) return true;
  if (
    type === "valid" &&
    actual >= 200 &&
    actual < 300 &&
    expected >= 200 &&
    expected < 300
  ) {
    return true;
  }
  return false;
}
