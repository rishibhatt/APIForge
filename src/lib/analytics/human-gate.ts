/**
 * Analytics (GA, PostHog, Clarity) only load for visitors that look human, so crawlers,
 * headless browsers and uptime/preview bots never reach the dashboards.
 *
 * Two checks:
 * 1. Static: skip automation (navigator.webdriver), crawler/headless/library user agents,
 *    and zero-size screens.
 * 2. Behavioural: wait for the first trusted input event (pointer, key, touch, wheel).
 *    Programmatic scroll and synthetic dispatchEvent() calls do not count.
 *
 * Pages are still rendered for every client, so search engines are unaffected.
 */

const BOT_UA =
  /bot|crawl|spider|slurp|scrape|headless|phantom|puppeteer|playwright|selenium|webdriver|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|quora link|whatsapp\/|python|curl|wget|httpie|httpclient|okhttp|axios|node-fetch|undici|go-http|java\/|libwww|scrapy|feedfetcher|mediapartners|apis-google|yandex|baidu|bytespider|petal|semrush|ahrefs|mj12|chatgpt-user|claude-user|perplexity|ccbot/i;

const HUMAN_EVENTS = ["pointermove", "pointerdown", "keydown", "touchstart", "wheel"] as const;

export function isLikelyBot(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return true;
  if (navigator.webdriver) return true;
  const ua = navigator.userAgent || "";
  if (!ua || BOT_UA.test(ua)) return true;
  const { width, height } = window.screen ?? { width: 0, height: 0 };
  if (!width || !height) return true;
  if (Array.isArray(navigator.languages) && navigator.languages.length === 0) return true;
  return false;
}

let humanPromise: Promise<void> | null = null;

/** Resolves on the first trusted interaction; never resolves for likely bots. */
export function whenHuman(): Promise<void> {
  if (humanPromise) return humanPromise;
  humanPromise = new Promise<void>((resolve) => {
    if (isLikelyBot()) return;
    const onEvent = (e: Event) => {
      if (!e.isTrusted) return;
      for (const name of HUMAN_EVENTS) window.removeEventListener(name, onEvent, true);
      resolve();
    };
    for (const name of HUMAN_EVENTS) {
      window.addEventListener(name, onEvent, { capture: true, passive: true });
    }
  });
  return humanPromise;
}
