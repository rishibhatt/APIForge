"use client";

import { useEffect } from "react";
import { whenHuman } from "@/lib/analytics/human-gate";

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

/** gtag.js, injected only after the visitor passes the human gate. */
export function GoogleAnalytics({ gaId }: { gaId: string }) {
  useEffect(() => {
    if (!gaId) return;
    void whenHuman().then(() => {
      const w = window as GtagWindow;
      if (w.gtag) return;
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag() {
        // gtag.js expects the arguments object, not an array.
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer!.push(arguments);
      };
      w.gtag("js", new Date());
      w.gtag("config", gaId, { page_path: window.location.pathname });

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);
    });
  }, [gaId]);

  return null;
}
