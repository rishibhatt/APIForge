import type { AiUsageSnapshot } from "@/lib/ai/usage-types";

interface RateLimitRecord {
  timestamps: number[];
  concurrentCount: number;
}

const windowMs = 60_000; // 1 minute
const maxRequestsPerWindow = 60;
export const MAX_CONCURRENT_TESTS = 5;

const clientStore = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
setInterval(() => {
  const now = Date.now();
  clientStore.forEach((record, key) => {
    record.timestamps = record.timestamps.filter((t: number) => now - t < windowMs);
    if (record.timestamps.length === 0 && record.concurrentCount === 0) {
      clientStore.delete(key);
    }
  });
}, 30_000).unref?.();

export function checkRateLimitAndConcurrency(clientId: string): {
  allowed: boolean;
  reason?: "RATE_LIMITED" | "CONCURRENCY_LIMIT";
  message?: string;
} {
  const now = Date.now();
  let record = clientStore.get(clientId);
  if (!record) {
    record = { timestamps: [], concurrentCount: 0 };
    clientStore.set(clientId, record);
  }

  // Filter timestamps within sliding window
  record.timestamps = record.timestamps.filter((t: number) => now - t < windowMs);

  if (record.timestamps.length >= maxRequestsPerWindow) {
    return {
      allowed: false,
      reason: "RATE_LIMITED",
      message: `Rate limit exceeded. Maximum ${maxRequestsPerWindow} proxy requests per minute allowed.`,
    };
  }

  if (record.concurrentCount >= MAX_CONCURRENT_TESTS) {
    return {
      allowed: false,
      reason: "CONCURRENCY_LIMIT",
      message: `Concurrency limit reached. Maximum ${MAX_CONCURRENT_TESTS} simultaneous requests allowed.`,
    };
  }

  return { allowed: true };
}

export function acquireConcurrencySlot(clientId: string): void {
  const record = clientStore.get(clientId);
  if (record) {
    record.timestamps.push(Date.now());
    record.concurrentCount += 1;
  }
}

export function releaseConcurrencySlot(clientId: string): void {
  const record = clientStore.get(clientId);
  if (record && record.concurrentCount > 0) {
    record.concurrentCount -= 1;
  }
}

/**
 * Best-effort client IP. Uses the first X-Forwarded-For hop, which is only trustworthy when the
 * deployment's edge proxy overwrites the header (e.g. Vercel). Self-hosted setups behind no proxy
 * should not rely on this for abuse protection: a client can send its own X-Forwarded-For and get
 * a fresh quota per value. Behind a proxy that APPENDS to the header, the first hop is
 * client-controlled; configure the proxy to overwrite it. Visitors sharing a NAT share one quota,
 * and without any proxy headers every visitor falls back to "127.0.0.1" (one shared bucket).
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    xff ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    "127.0.0.1"
  );
}

/**
 * Sliding-window check that also records the request (no concurrency slot held).
 * Use a key prefix per feature (e.g. "ai:", "parse:") so buckets do not collide.
 */
export function consumeRateLimit(key: string): {
  allowed: boolean;
  message?: string;
} {
  const check = checkRateLimitAndConcurrency(key);
  if (!check.allowed && check.reason === "RATE_LIMITED") {
    return { allowed: false, message: check.message };
  }
  acquireConcurrencySlot(key);
  releaseConcurrencySlot(key);
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Rolling-window quota (used for the per-visitor AI quota)
// ---------------------------------------------------------------------------

export interface WindowLimitResult extends AiUsageSnapshot {
  /** false when this call was refused (consume) or when no slot is left (peek). */
  allowed: boolean;
}

interface WindowRecord {
  /** Ascending request timestamps (epoch ms) still inside the window. */
  timestamps: number[];
  windowMs: number;
}

interface WindowGlobal {
  store: Map<string, WindowRecord>;
  sweeper?: ReturnType<typeof setInterval>;
}

/**
 * Next.js bundles each route separately, so a module-level Map would exist once per route and the
 * quota would not be shared across AI tools. Pinning the store to globalThis shares it per process.
 * (Serverless: still per warm instance; use an external store such as Redis for a hard guarantee.)
 */
const WINDOW_GLOBAL_KEY = "__apiforgeWindowLimitStore__";

function getWindowGlobal(): WindowGlobal {
  const g = globalThis as unknown as Record<string, WindowGlobal | undefined>;
  let w = g[WINDOW_GLOBAL_KEY];
  if (!w) {
    w = { store: new Map() };
    g[WINDOW_GLOBAL_KEY] = w;
  }
  if (!w.sweeper) {
    const store = w.store;
    const timer = setInterval(() => sweepWindowStore(store, Date.now()), 60_000);
    (timer as { unref?: () => void }).unref?.();
    w.sweeper = timer;
  }
  return w;
}

function sweepWindowStore(store: Map<string, WindowRecord>, now: number): void {
  store.forEach((rec, key) => {
    pruneWindow(rec, now);
    if (rec.timestamps.length === 0) store.delete(key);
  });
}

function pruneWindow(rec: WindowRecord, now: number): void {
  const cutoff = now - rec.windowMs;
  let i = 0;
  while (i < rec.timestamps.length && rec.timestamps[i]! <= cutoff) i++;
  if (i > 0) rec.timestamps.splice(0, i);
}

function snapshotOf(
  rec: WindowRecord | undefined,
  limit: number,
  windowMs: number,
): WindowLimitResult {
  const count = rec?.timestamps.length ?? 0;
  const oldest = rec?.timestamps[0];
  return {
    allowed: count < limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: oldest === undefined ? null : oldest + windowMs,
    windowMs,
  };
}

/**
 * Counts one request against a rolling window and reports the state AFTER the call.
 * When the limit is already reached nothing is recorded and `allowed` is false.
 * `resetAt` is when the OLDEST counted request leaves the window (one slot frees up), or null.
 */
export function consumeWindowLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): WindowLimitResult {
  const { store } = getWindowGlobal();
  let rec = store.get(key);
  if (!rec) {
    rec = { timestamps: [], windowMs };
    store.set(key, rec);
  }
  rec.windowMs = windowMs;
  pruneWindow(rec, now);
  if (rec.timestamps.length >= limit) {
    return { ...snapshotOf(rec, limit, windowMs), allowed: false };
  }
  rec.timestamps.push(now);
  return { ...snapshotOf(rec, limit, windowMs), allowed: true };
}

/** Read-only view of a rolling window; never records a request. `allowed` = a slot is free. */
export function peekWindowLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): WindowLimitResult {
  const { store } = getWindowGlobal();
  const rec = store.get(key);
  if (rec) {
    rec.windowMs = windowMs;
    pruneWindow(rec, now);
    if (rec.timestamps.length === 0) store.delete(key);
  }
  return snapshotOf(store.get(key), limit, windowMs);
}

/** Test helper: drop all window state. */
export function resetWindowLimits(): void {
  getWindowGlobal().store.clear();
}