/**
 * Client-side checks before POST /api/swagger/parse.
 * Server still performs authoritative parse; this avoids obviously invalid input.
 */
export function getSpecUrlValidationError(input: string): string | null {
  const t = input.trim();
  if (!t) {
    return "Enter a URL to your OpenAPI or Swagger document.";
  }
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return "That does not look like a valid URL.";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return "Only http:// and https:// URLs are supported.";
  }
  if (!u.hostname || u.hostname.length === 0) {
    return "The URL must include a hostname.";
  }
  return null;
}

export function isValidSpecUrl(input: string): boolean {
  return getSpecUrlValidationError(input) === null;
}
