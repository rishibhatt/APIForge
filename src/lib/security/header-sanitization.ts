import { containsControlCharacters } from "./url-validation";

const STRIPPED_REQUEST_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "forwarded",
  "cookie",
  "set-cookie",
]);

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "api-key",
  "x-auth-token",
  "token",
  "secret",
]);

export function sanitizeRequestHeaders(
  headers: Record<string, string> | undefined,
): {
  valid: boolean;
  cleanHeaders: Record<string, string>;
  error?: string;
} {
  if (!headers) return { valid: true, cleanHeaders: {} };

  const cleanHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const k = key.trim();
    const kLower = k.toLowerCase();
    const v = String(value ?? "").trim();

    if (STRIPPED_REQUEST_HEADERS.has(kLower)) {
      continue;
    }

    if (containsControlCharacters(k) || containsControlCharacters(v)) {
      return {
        valid: false,
        cleanHeaders: {},
        error: `Control character detected in header "${k}"`,
      };
    }

    cleanHeaders[k] = v;
  }

  return { valid: true, cleanHeaders };
}

export function redactSensitiveHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  if (!headers) return {};
  const redacted: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    const kLower = key.toLowerCase();
    if (SENSITIVE_HEADER_KEYS.has(kLower)) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = val;
    }
  }
  return redacted;
}
