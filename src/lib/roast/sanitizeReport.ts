import type { SanitizedRoastReport } from "./types";

/**
 * Strips sensitive query params, credentials, and tokens from URLs.
 */
export function sanitizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.username = "";
    u.password = "";
    const sensitiveParams = [
      "key",
      "api_key",
      "apikey",
      "secret",
      "token",
      "auth",
      "access_token",
      "password",
      "pwd",
    ];
    for (const p of sensitiveParams) {
      if (u.searchParams.has(p)) {
        u.searchParams.set(p, "REDACTED");
      }
    }
    return u.toString();
  } catch {
    return rawUrl.replace(
      /(key|api_key|secret|token|password)=[^&]+/gi,
      "$1=[REDACTED]",
    );
  }
}

/**
 * Sanitizes an entire roast report before making it public or shareable.
 */
export function sanitizeRoastReport(
  raw: SanitizedRoastReport,
): SanitizedRoastReport {
  const sanitizedTitle = raw.title
    ? raw.title.replace(/(key|secret|token|pass|auth)[:=]\s*\S+/gi, "$1=[REDACTED]")
    : "API Specification";

  const sanitizedSpecUrl = raw.specUrl ? sanitizeUrl(raw.specUrl) : undefined;

  const sanitizedTopPatterns = raw.summary.topPatterns.map((pattern) => ({
    ...pattern,
    representativeEndpoints: pattern.representativeEndpoints.map((ep) =>
      ep.replace(/(token|key|secret)=[^&]+/gi, "$1=[REDACTED]"),
    ),
  }));

  return {
    ...raw,
    title: sanitizedTitle,
    specUrl: sanitizedSpecUrl,
    summary: {
      ...raw.summary,
      topPatterns: sanitizedTopPatterns,
    },
  };
}
