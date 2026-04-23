/** Pull server base URLs from OpenAPI 3 `servers` or Swagger 2 host/basePath/schemes. */
export function extractServerUrls(doc: Record<string, unknown>): string[] {
  const servers = doc.servers;
  if (Array.isArray(servers)) {
    const out: string[] = [];
    for (const s of servers) {
      if (s && typeof s === "object" && "url" in s) {
        const u = (s as { url?: unknown }).url;
        if (typeof u === "string" && u.trim()) out.push(u.trim().replace(/\/$/, ""));
      }
    }
    return Array.from(new Set(out));
  }

  const host = typeof doc.host === "string" ? doc.host.trim() : "";
  const basePath =
    typeof doc.basePath === "string" ? doc.basePath.trim() : "";
  const pathPart =
    !basePath || basePath === "/"
      ? ""
      : basePath.startsWith("/")
        ? basePath
        : `/${basePath}`;

  if (!host) return [];

  const schemes = Array.isArray(doc.schemes)
    ? doc.schemes.filter((x): x is string => typeof x === "string")
    : [];

  const schList = schemes.length ? schemes : ["https"];
  return Array.from(
    new Set(
      schList.map((sch) =>
        `${sch}://${host.replace(/\/$/, "")}${pathPart}`.replace(/\/$/, ""),
      ),
    ),
  );
}
