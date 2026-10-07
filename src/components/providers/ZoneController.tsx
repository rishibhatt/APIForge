"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** True for every Roast route: /roast-my-api and /roast/[reportId]. */
export function isRoastPath(pathname: string | null | undefined): boolean {
  return pathname != null && pathname.startsWith("/roast");
}

/**
 * Marks <html data-zone="roast"> on Roast routes so the ember theme (globals.css) covers
 * everything, including portaled drawers and modals. Roast page shells also carry the
 * `roastZone` class so the first server render is already orange.
 */
export function ZoneController() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (isRoastPath(pathname)) root.dataset.zone = "roast";
    else delete root.dataset.zone;
  }, [pathname]);

  return null;
}
