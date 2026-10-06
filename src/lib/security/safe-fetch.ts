import type { IpValidationOptions } from "./ip-validation";
import { resolveAndValidateDestination } from "./url-validation";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface SafeFetchOptions {
  security: IpValidationOptions;
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  /** Final URL after redirects */
  url: string;
  contentType: string;
  text: string;
}

export class SafeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeFetchError";
  }
}

/**
 * Server-side GET that re-runs the SSRF guard (protocol, port, DNS -> IP checks)
 * on the initial URL and on every redirect hop, with a timeout and a response size cap.
 *
 * Note: DNS is resolved once for validation and again by fetch, so a hostile DNS server
 * can still rebind between the two lookups. Pinning the resolved IP needs a custom dispatcher.
 */
export async function safeFetchText(
  url: string,
  options: SafeFetchOptions,
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxBytes = options.maxBytes ?? 15 * 1024 * 1024;
  const maxRedirects = options.maxRedirects ?? 5;

  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const check = await resolveAndValidateDestination(current, options.security);
    if (!check.allowed || !check.url) {
      throw new SafeFetchError(
        check.message || "Destination is not permitted for security reasons.",
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let res: Response;
      try {
        res = await fetch(check.url.toString(), {
          method: "GET",
          headers: options.headers,
          redirect: "manual",
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new SafeFetchError(`Timed out fetching ${check.url.origin}`);
        }
        throw new SafeFetchError(`Could not connect to ${check.url.origin}`);
      }

      if (REDIRECT_STATUSES.has(res.status)) {
        const location = res.headers.get("location");
        await res.body?.cancel().catch(() => undefined);
        if (!location) {
          throw new SafeFetchError("Redirect response missing Location header.");
        }
        try {
          current = new URL(location, check.url).toString();
        } catch {
          throw new SafeFetchError("Invalid redirect location.");
        }
        continue;
      }

      let text = "";
      if (res.body) {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            total += value.byteLength;
            if (total > maxBytes) {
              await reader.cancel().catch(() => undefined);
              throw new SafeFetchError(
                `Response exceeds ${Math.round(maxBytes / (1024 * 1024))}MB limit.`,
              );
            }
            chunks.push(value);
          }
        }
        text = Buffer.concat(chunks).toString("utf-8");
      }

      return {
        ok: res.ok,
        status: res.status,
        url: check.url.toString(),
        contentType: res.headers.get("content-type") ?? "",
        text,
      };
    } catch (err) {
      if (err instanceof SafeFetchError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new SafeFetchError(`Timed out fetching ${check.url.origin}`);
      }
      throw new SafeFetchError(`Failed to read response from ${check.url.origin}`);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new SafeFetchError(`Too many redirects (max ${maxRedirects}).`);
}
