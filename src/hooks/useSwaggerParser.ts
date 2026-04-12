"use client";

import { useCallback, useState } from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Endpoint } from "@/types/api";

export function useSwaggerParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setEndpoints = useWorkspaceStore((s) => s.setEndpoints);
  const setParseError = useWorkspaceStore((s) => s.setParseError);
  const setParsing = useWorkspaceStore((s) => s.setParsing);

  const parseUrl = useCallback(
    async (url: string) => {
      setIsLoading(true);
      setParsing(true);
      setError(null);
      setParseError(null);
      try {
        const res = await fetch("/api/swagger/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
          endpoints?: Endpoint[];
          title?: string;
        };
        if (!res.ok || !data.success || !data.endpoints) {
          throw new Error(data.error || "Parse failed");
        }
        setEndpoints(data.endpoints, { title: data.title });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Parse failed";
        setError(msg);
        setParseError(msg);
      } finally {
        setIsLoading(false);
        setParsing(false);
      }
    },
    [setEndpoints, setParseError, setParsing],
  );

  const parseFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setParsing(true);
      setError(null);
      setParseError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/swagger/parse", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
          endpoints?: Endpoint[];
          title?: string;
        };
        if (!res.ok || !data.success || !data.endpoints) {
          throw new Error(data.error || "Parse failed");
        }
        setEndpoints(data.endpoints, { title: data.title });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Parse failed";
        setError(msg);
        setParseError(msg);
      } finally {
        setIsLoading(false);
        setParsing(false);
      }
    },
    [setEndpoints, setParseError, setParsing],
  );

  return { parseUrl, parseFile, isLoading, error };
}
