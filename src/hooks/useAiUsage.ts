"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  AI_HEADER_LIMIT,
  AI_HEADER_REMAINING,
  AI_HEADER_RESET,
  AI_REQUEST_LIMIT,
  AI_WINDOW_MS,
  type AiUsageSnapshot,
} from "@/lib/ai/usage-types";

/**
 * Module-level store for the visitor's AI quota. Every AI fetch site calls `reportAiHeaders(res.headers)`
 * (success or error) so the numbers stay current without polling.
 */

interface StoreState {
  limit: number;
  remaining: number;
  resetAt: number | null;
  /** True once real numbers arrived (from the usage endpoint, headers, or a 429 body). */
  known: boolean;
  loading: boolean;
  /** Bumped by the minute ticker so subscribers re-render and recompute `resetIn`. */
  tick: number;
}

let state: StoreState = {
  limit: AI_REQUEST_LIMIT,
  remaining: AI_REQUEST_LIMIT,
  resetAt: null,
  known: false,
  loading: false,
  tick: 0,
};

const listeners = new Set<() => void>();
let fetchStarted = false;
let timer: ReturnType<typeof setInterval> | null = null;

function emit() {
  for (const l of Array.from(listeners)) l();
}

function patch(next: Partial<StoreState>) {
  state = { ...state, ...next };
  emit();
}

function toInt(v: string | null): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** "3h 12m", "12m", "under 1m". Rounds minutes up so the label never reads 0 early. */
export function formatResetIn(resetAt: number | null, now: number = Date.now()): string {
  if (resetAt == null) return "";
  const ms = resetAt - now;
  if (ms <= 0) return "now";
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin < 1) return "under 1m";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function reportAiUsageSnapshot(usage: AiUsageSnapshot | null | undefined): void {
  if (!usage || typeof usage.limit !== "number" || typeof usage.remaining !== "number") return;
  patch({
    limit: usage.limit,
    remaining: Math.max(0, usage.remaining),
    resetAt: typeof usage.resetAt === "number" ? usage.resetAt : null,
    known: true,
    loading: false,
  });
}

/** Call after every AI fetch, success or error. Missing headers leave the numbers as they were. */
export function reportAiHeaders(headers: Headers): void {
  try {
    const limit = toInt(headers.get(AI_HEADER_LIMIT));
    const remaining = toInt(headers.get(AI_HEADER_REMAINING));
    const reset = toInt(headers.get(AI_HEADER_RESET));
    if (limit == null && remaining == null && reset == null) return;
    patch({
      limit: limit ?? state.limit,
      remaining: remaining != null ? Math.max(0, remaining) : state.remaining,
      resetAt: reset != null ? (reset > 0 ? reset : null) : state.resetAt,
      known: true,
      loading: false,
    });
  } catch {
    /* headers unreadable: keep the last known numbers */
  }
}

async function fetchUsage(): Promise<void> {
  patch({ loading: true });
  try {
    const res = await fetch("/api/ai/usage", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const usage = (await res.json()) as AiUsageSnapshot;
    reportAiUsageSnapshot(usage);
  } catch {
    patch({ loading: false });
  }
}

function ensureLoaded() {
  if (fetchStarted) return;
  fetchStarted = true;
  void fetchUsage();
}

function startTicker() {
  if (timer) return;
  timer = setInterval(() => {
    const now = Date.now();
    // A slot frees when the oldest request leaves the window: pull fresh numbers.
    if (state.resetAt != null && state.resetAt <= now && state.remaining < state.limit) {
      void fetchUsage();
    }
    patch({ tick: state.tick + 1 });
  }, 30_000);
}

function stopTicker() {
  if (timer) clearInterval(timer);
  timer = null;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  startTicker();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) stopTicker();
  };
}

const getSnapshot = () => state;
const serverSnapshot: StoreState = state;
const getServerSnapshot = () => serverSnapshot;

/** Current numbers outside React (toast copy, event handlers). */
export function getAiUsageNow() {
  return {
    limit: state.limit,
    remaining: state.remaining,
    resetAt: state.resetAt,
    resetIn: formatResetIn(state.resetAt),
  };
}

export interface AiUsage {
  limit: number;
  remaining: number;
  resetAt: number | null;
  loading: boolean;
  /** False until the first real numbers arrive; hide the UI until then. */
  known: boolean;
  /** "3h 12m"; empty when nothing is counted yet. */
  resetIn: string;
  /** No requests left in this window. */
  exhausted: boolean;
  windowMs: number;
}

export function useAiUsage(): AiUsage {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    ensureLoaded();
  }, []);
  return {
    limit: s.limit,
    remaining: s.remaining,
    resetAt: s.resetAt,
    loading: s.loading,
    known: s.known,
    resetIn: formatResetIn(s.resetAt),
    exhausted: s.known && s.remaining <= 0,
    windowMs: AI_WINDOW_MS,
  };
}
