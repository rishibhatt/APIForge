import { containsControlCharacters } from "./url-validation";

/** Headers a user may add when the docs page or spec needs auth (Authorization, X-API-Key, Cookie, …). */
export type SpecFetchHeaders = Record<string, string>;

const MAX_HEADERS = 8;
const MAX_VALUE_LENGTH = 8192;
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,100}$/;

/** Transport-level headers fetch manages itself, and proxy headers that would spoof the caller. */
const FORBIDDEN = new Set([
  "host",
  "content-length",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "expect",
  "accept-encoding",
  "proxy-authorization",
  "proxy-authenticate",
  "forwarded",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
]);

export type SpecFetchHeadersResult =
  | { ok: true; headers: SpecFetchHeaders }
  | { ok: false; error: string };

/** Validates the optional `headers` object from a parse request body. */
export function parseSpecFetchHeaders(input: unknown): SpecFetchHeadersResult {
  if (input === undefined || input === null) return { ok: true, headers: {} };
  if (typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "headers must be an object of header names to values" };
  }
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > MAX_HEADERS) {
    return { ok: false, error: `At most ${MAX_HEADERS} auth headers are allowed` };
  }
  const headers: SpecFetchHeaders = {};
  for (const [rawName, rawValue] of entries) {
    const name = rawName.trim();
    if (typeof rawValue !== "string") {
      return { ok: false, error: `Header "${name}" must have a text value` };
    }
    const value = rawValue.trim();
    if (!name && !value) continue;
    if (!HEADER_NAME.test(name)) return { ok: false, error: `"${name}" is not a valid header name` };
    if (FORBIDDEN.has(name.toLowerCase())) {
      return { ok: false, error: `Header "${name}" cannot be set` };
    }
    if (containsControlCharacters(value) || value.length > MAX_VALUE_LENGTH) {
      return { ok: false, error: `Header "${name}" has an invalid value` };
    }
    if (value) headers[name] = value;
  }
  return { ok: true, headers };
}
