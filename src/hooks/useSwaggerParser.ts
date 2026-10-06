"use client";

import { useCallback, useRef, useState } from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Endpoint } from "@/types/api";
import { getSpecUrlValidationError } from "@/lib/validate-swagger-url";
import { describeParseError } from "@/lib/parse-error-info";
import { clearSpecFromAddressBar, setSpecInAddressBar } from "@/lib/spec-deeplink";

interface ParseResponse {
  success?: boolean;
  error?: string;
  endpoints?: Endpoint[];
  title?: string;
  version?: string;
  serverUrls?: string[];
  securitySchemes?: Record<string, unknown>;
}

/** After this long without a response the server is past the download and resolving $refs. */
const PARSING_PHASE_AFTER_MS = 900;
/** On the landing page, hold the "N endpoints found" confirmation briefly before the workspace replaces it. */
const LANDING_CONFIRM_MS = 450;

export function useSwaggerParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setEndpoints = useWorkspaceStore((s) => s.setEndpoints);
  const setParseError = useWorkspaceStore((s) => s.setParseError);
  const setSpecMeta = useWorkspaceStore((s) => s.setSpecMeta);
  const setParseProgress = useWorkspaceStore((s) => s.setParseProgress);
  const runId = useRef(0);

  const run = useCallback(
    async (label: string, request: () => Promise<Response>, specUrl?: string) => {
      const id = ++runId.current;
      const hadWorkspace = useWorkspaceStore.getState().endpoints.length > 0;
      setIsLoading(true);
      setError(null);
      setParseError(null);
      setParseProgress({ phase: "fetching", url: label, endpointCount: null, error: null });
      const phaseTimer = window.setTimeout(() => {
        if (runId.current === id) setParseProgress({ phase: "parsing" });
      }, PARSING_PHASE_AFTER_MS);

      try {
        let res: Response;
        try {
          res = await request();
        } catch {
          throw new Error("Failed to fetch: network error");
        }
        let data: ParseResponse;
        try {
          data = (await res.json()) as ParseResponse;
        } catch {
          throw new Error(`HTTP ${res.status} from the parser`);
        }
        if (!res.ok || !data.success || !data.endpoints) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        if (data.endpoints.length === 0) {
          throw new Error("No endpoints found in this spec");
        }
        if (runId.current !== id) return;
        window.clearTimeout(phaseTimer);
        setParseProgress({ phase: "done", endpointCount: data.endpoints.length });
        if (!hadWorkspace) {
          await new Promise((r) => window.setTimeout(r, LANDING_CONFIRM_MS));
          if (runId.current !== id) return;
        }
        setEndpoints(
          data.endpoints,
          Array.isArray(data.serverUrls) ? data.serverUrls : undefined,
          data.securitySchemes,
        );
        setSpecMeta(
          typeof data.title === "string" ? data.title : null,
          typeof data.version === "string" ? data.version : null,
        );
        // Refresh reopens this spec; a file upload has no URL to keep.
        if (specUrl) setSpecInAddressBar(specUrl);
        else clearSpecFromAddressBar();
      } catch (e) {
        if (runId.current !== id) return;
        const msg = e instanceof Error ? e.message : "Parse failed";
        setError(msg);
        setParseError(msg);
        setParseProgress({ phase: "error", error: describeParseError(msg) });
        // Keep the current workspace's metadata when a re-parse fails; it is still on screen.
        if (!hadWorkspace) setSpecMeta(null, null);
      } finally {
        window.clearTimeout(phaseTimer);
        if (runId.current === id) setIsLoading(false);
      }
    },
    [setEndpoints, setParseError, setSpecMeta, setParseProgress],
  );

  const parseUrl = useCallback(
    async (url: string) => {
      const clientErr = getSpecUrlValidationError(url);
      if (clientErr) {
        setError(clientErr);
        setParseError(clientErr);
        setParseProgress({
          phase: "error",
          url,
          endpointCount: null,
          error: describeParseError(clientErr),
        });
        return;
      }
      const trimmed = url.trim();
      await run(trimmed, () =>
        fetch("/api/swagger/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        }),
        trimmed,
      );
    },
    [run, setParseError, setParseProgress],
  );

  const parseFile = useCallback(
    async (file: File) => {
      await run(file.name, () => {
        const fd = new FormData();
        fd.append("file", file);
        return fetch("/api/swagger/parse", { method: "POST", body: fd });
      });
    },
    [run],
  );

  return { parseUrl, parseFile, isLoading, error };
}
