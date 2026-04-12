"use client";

import { useCallback, useRef, useState } from "react";
import type { Endpoint } from "@/types/api";
import type { OutputTab } from "@/types/api";
import {
  clearGenerationCache,
  getGenerationCache,
  setGenerationCache,
} from "@/lib/generation-cache";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function useGroqStream() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const setLastGlobal = useWorkspaceStore((s) => s.setLastGenerationMs);

  const generate = useCallback(
    async (
      endpoint: Endpoint,
      type: OutputTab,
      opts?: { force?: boolean },
    ) => {
      if (!opts?.force) {
        const hit = getGenerationCache(endpoint.id, type);
        if (hit !== undefined) {
          setResult(hit);
          setError(null);
          setLoading(false);
          return;
        }
      } else {
        clearGenerationCache(endpoint.id, type);
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);
      setResult("");
      const t0 = performance.now();

      try {
        const res = await fetch("/api/groq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, type }),
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

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let acc = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setResult(acc);
        }

        setGenerationCache(endpoint.id, type, acc);
        const ms = Math.round(performance.now() - t0);
        setLastLatencyMs(ms);
        setLastGlobal(ms);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Generation failed");
        setResult("");
        setLastGlobal(null);
      } finally {
        setLoading(false);
      }
    },
    [setLastGlobal],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    result,
    loading,
    error,
    lastLatencyMs,
    generate,
    cancel,
  };
}
