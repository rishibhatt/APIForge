"use client";

import React, { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type PostHogClient = { capture: (event: string, props?: Record<string, unknown>) => unknown };

/**
 * PostHog loads after the page is idle (dynamic import), so analytics never competes
 * with first paint or input. Page views fired before it loads are queued.
 */
let client: PostHogClient | null = null;
let loading = false;
const pending: string[] = [];

function whenIdle(cb: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(cb, { timeout: 4000 });
  } else {
    setTimeout(cb, 2500);
  }
}

function loadPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || loading) return;
  loading = true;
  whenIdle(() => {
    void import("posthog-js").then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false, // Captured manually below for client-side navigation
        capture_pageleave: true,
        loaded: (ph) => {
          if (process.env.NODE_ENV === "development") ph.debug();
          client = ph;
          for (const url of pending.splice(0)) ph.capture("$pageview", { $current_url: url });
        },
      });
    });
  });
}

function PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    const url = window.origin + pathname + (qs ? `?${qs}` : "");
    if (client) client.capture("$pageview", { $current_url: url });
    else pending.push(url);
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(loadPostHog, []);

  return (
    <>
      <Suspense fallback={null}>
        <PageViews />
      </Suspense>
      {children}
    </>
  );
}
