/** Keeps `/?spec=<url>` in the address bar in step with the loaded workspace, so a refresh reopens it. */
export function setSpecInAddressBar(specUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    const u = new URL(window.location.href);
    if (u.pathname !== "/") return;
    if (u.searchParams.get("spec") === specUrl) return;
    u.searchParams.set("spec", specUrl);
    window.history.replaceState(window.history.state, "", `${u.pathname}${u.search}${u.hash}`);
  } catch {
    /* ignore */
  }
}

export function clearSpecFromAddressBar(): void {
  if (typeof window === "undefined") return;
  try {
    const u = new URL(window.location.href);
    if (!u.searchParams.has("spec")) return;
    u.searchParams.delete("spec");
    window.history.replaceState(window.history.state, "", `${u.pathname}${u.search}${u.hash}`);
  } catch {
    /* ignore */
  }
}
