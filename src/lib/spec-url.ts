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
    const dir = u.pathname.replace(/\/[^/]+$/, "");

    if (path.endsWith("/index.html") || path.endsWith("index.html")) {
      const base = `${u.origin}${dir}`;
      push(`${base}/swagger/v1/swagger.json`);
      push(`${base}/swagger/v1/swagger.yaml`);
      push(`${base}/v1/swagger.json`);
      push(`${base}/v1/swagger.yaml`);
      push(`${base}/openapi.json`);
      push(`${base}/v3/api-docs`);
    }

    if (path.includes("/swagger/ui") || path.endsWith("/swagger")) {
      push(`${u.origin}/swagger/v1/swagger.json`);
    }

    const noTrail = path.replace(/\/$/, "");
    if (noTrail.endsWith("/docs")) {
      push(`${u.origin}/swagger/v1/swagger.json`);
      push(`${u.origin}/swagger/v1/swagger.yaml`);
      push(`${u.origin}/openapi.json`);
      push(`${u.origin}/swagger.json`);
      push(`${u.origin}/v3/api-docs`);
    }
  } catch {
    /* invalid URL — only initial is tried */
  }

  return ordered;
}
