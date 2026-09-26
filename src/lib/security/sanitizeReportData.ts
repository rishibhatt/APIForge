/**
 * Sanitizes sensitive API data before creating public shareable reports.
 * Redacts authorization headers, API keys, bearer tokens, cookies, passwords,
 * client secrets, and environment variable patterns.
 */

const SENSITIVE_KEYS = new Set([
  "authorization",
  "auth",
  "bearer",
  "api_key",
  "apikey",
  "x-api-key",
  "password",
  "secret",
  "token",
  "client_secret",
  "private_key",
  "cookie",
  "set-cookie",
  "access_token",
  "id_token",
  "refresh_token",
]);

const SENSITIVE_PATTERNS = [
  /bearer\s+[a-zA-Z0-9_\-\.\~+/=]+/gi,
  /basic\s+[a-zA-Z0-9+/=]+/gi,
  /api[_\-]?key[=\s:]+["']?[a-zA-Z0-9_\-]+["']?/gi,
  /secret[=\s:]+["']?[a-zA-Z0-9_\-]+["']?/gi,
];

export function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    let sanitized = value;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED_SECRET]");
    }
    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lowerKey = k.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        cleaned[k] = "[REDACTED_SECRET]";
      } else {
        cleaned[k] = sanitizeValue(v);
      }
    }
    return cleaned;
  }

  return value;
}

export function sanitizeReportPayload<T>(payload: T): T {
  return sanitizeValue(payload) as T;
}
