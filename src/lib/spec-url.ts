/**
 * Build candidate URLs to try when the user pastes a Swagger UI page instead of
 * the raw OpenAPI document (e.g. .../index.html vs .../swagger/v1/swagger.json).
 */
export function specUrlCandidates(initial: string): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (u: string) => {
    if (!seen.has(u)) {
      seen.add(u);
      ordered.push(u);
    }
  };

  push(initial.trim());

  try {
    const u = new URL(initial.trim());
    const path = u.pathname.toLowerCase();

    if (path.endsWith("/index.html") || path.endsWith("index.html")) {
      push(`${u.origin}/swagger/v1/swagger.json`);
      push(`${u.origin}/swagger/v1/swagger.yaml`);
    }

    if (path.includes("/swagger/ui") || path.endsWith("/swagger")) {
      push(`${u.origin}/swagger/v1/swagger.json`);
    }
  } catch {
    /* invalid URL — only initial is tried */
  }

  return ordered;
}
