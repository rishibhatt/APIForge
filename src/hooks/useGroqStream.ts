"use client";

import { useCallback, useRef, useState } from "react";
import type {
  Endpoint,
  GenerationScope,
  GroqStreamTab,
  IdePromptScope,
} from "@/types/api";
import {
  clearGenerationCache,
  generationCacheKey,
  getGenerationCache,
  setGenerationCache,
} from "@/lib/generation-cache";
import { parseUsageFromResponseHeaders } from "@/lib/groq-token-usage";
import { useWorkspaceStore } from "@/store/workspaceStore";

export type GenerateOptions = {
  force?: boolean;
  idePrompt?: IdePromptScope;
  allEndpoints?: Endpoint[];
  /** Operation considered "primary" in the UI (sidebar); defaults to first in scope */
  primaryEndpoint?: Endpoint | null;
};

export function useGroqStream() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Prevents a superseded (aborted) request from clearing loading / wiping state. */
  const genIdRef = useRef(0);
  const setLastGlobal = useWorkspaceStore((s) => s.setLastGenerationMs);
  const setLastGroqUsage = useWorkspaceStore((s) => s.setLastGroqUsage);

  const generate = useCallback(
    async (
      scopedEndpoints: Endpoint[],
      generationScope: GenerationScope,
      type: GroqStreamTab,
      opts?: GenerateOptions,
    ) => {
      if (scopedEndpoints.length === 0) {
        setResult("");
        setError(null);
        setLoading(false);
        return;
      }

      const myId = ++genIdRef.current;
      const cacheKey = generationCacheKey(generationScope, scopedEndpoints, type);

      if (!opts?.force) {
        const hit = getGenerationCache(cacheKey);
        if (hit !== undefined) {
          if (genIdRef.current !== myId) return;
          setResult(hit);
          setError(null);
          setLoading(false);
          /* Cached generations have no usage headers */
          return;
        }
      } else {
        clearGenerationCache(cacheKey);
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);
      setResult("");
      setLastGroqUsage(null);
      const t0 = performance.now();

      const primary =
        opts?.primaryEndpoint ??
        scopedEndpoints[0]!;

      try {
        const payload: Record<string, unknown> = {
          endpoint: primary,
          endpoints: scopedEndpoints,
          scope: generationScope,
          type,
        };
        if (type === "prompt" && opts?.idePrompt) {
          payload.idePrompt = opts.idePrompt;
        }
        if (opts?.allEndpoints?.length) {
          payload.allEndpoints = opts.allEndpoints;
        }

        const res = await fetch("/api/groq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: ac.signal,
        });

        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            const t = await res.text();
            if (t) msg = t.slice(0, 200);
          }
          throw new Error(msg);
        }

        const usageHdr = parseUsageFromResponseHeaders(res.headers);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let acc = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          if (genIdRef.current === myId) {
            setResult(acc);
          }
        }

        if (genIdRef.current === myId) {
          setGenerationCache(cacheKey, acc);
          const ms = Math.round(performance.now() - t0);
          setLastLatencyMs(ms);
          setLastGlobal(ms);
          setLastGroqUsage(usageHdr);
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        if (genIdRef.current !== myId) return;
        setError(e instanceof Error ? e.message : "Generation failed");
        setResult("");
        setLastGlobal(null);
        setLastGroqUsage(null);
      } finally {
        if (genIdRef.current === myId) {
          setLoading(false);
        }
      }
    },
    [setLastGlobal, setLastGroqUsage],
  );

  return {
    result,
    loading,
    error,
    lastLatencyMs,
    generate,
  };
}
