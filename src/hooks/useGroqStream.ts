"use client";

import { useCallback, useRef, useState, useEffect } from "react";
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
import { parseAIMetadataFromHeaders } from "@/lib/groq-token-usage";
import { reportAiHeaders } from "@/hooks/useAiUsage";
import {
  AiRequestError,
  handleAiErrorResponse,
  handleAiNetworkError,
} from "@/components/ai/aiRequest";
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const genIdRef = useRef(0);
  const generateRef = useRef<
    ((e: Endpoint[], s: GenerationScope, t: GroqStreamTab, o?: GenerateOptions) => Promise<void>) | null
  >(null);
  const setLastGlobal = useWorkspaceStore((s) => s.setLastGenerationMs);
  const setLastGroqUsage = useWorkspaceStore((s) => s.setLastGroqUsage);
  const setLastAiMeta = useWorkspaceStore((s) => s.setLastAiMeta);

  // Progressive status timer: if request takes > 1.2s, display informative technical feedback
  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;
    if (loading) {
      setStatusMessage("Dispatching to AI Gateway...");
      t1 = setTimeout(() => {
        setStatusMessage("Optimizing prompt with high-speed LPU model...");
      }, 1200);
      t2 = setTimeout(() => {
        setStatusMessage("Routing through resilient fallback chain...");
      }, 3500);
    } else {
      setStatusMessage(null);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

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
        const meta0 = useWorkspaceStore.getState();
        if (meta0.specTitle) payload.specTitle = meta0.specTitle;
        if (meta0.specServerUrls.length) payload.serverUrls = meta0.specServerUrls;
        if (meta0.specSecuritySchemes) payload.securitySchemes = meta0.specSecuritySchemes;
        if (opts?.allEndpoints?.length) {
          payload.allEndpoints = opts.allEndpoints;
        }

        const res = await fetch("/api/groq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: ac.signal,
        });

        reportAiHeaders(res.headers);

        if (!res.ok) {
          throw await handleAiErrorResponse(res, {
            onRetry: () =>
              void generateRef.current?.(scopedEndpoints, generationScope, type, { ...opts, force: true }),
          });
        }

        const meta = parseAIMetadataFromHeaders(res.headers);
        setLastAiMeta(meta);

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
          setLastGroqUsage(meta.usage);
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        if (genIdRef.current !== myId) return;
        // Toast already shown for typed AI errors; a bare fetch rejection is a network failure.
        const failure =
          e instanceof AiRequestError
            ? e
            : handleAiNetworkError({
                onRetry: () =>
                  void generateRef.current?.(scopedEndpoints, generationScope, type, { ...opts, force: true }),
              });
        setError(failure.message);
        setResult("");
        setLastGlobal(null);
        setLastGroqUsage(null);
      } finally {
        if (genIdRef.current === myId) {
          setLoading(false);
        }
      }
    },
    [setLastGlobal, setLastGroqUsage, setLastAiMeta],
  );

  useEffect(() => {
    generateRef.current = generate;
  }, [generate]);

  /** Cancel the request in flight; whatever streamed so far stays on screen. */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  return {
    stop,
    result,
    loading,
    statusMessage,
    error,
    lastLatencyMs,
    generate,
  };
}
