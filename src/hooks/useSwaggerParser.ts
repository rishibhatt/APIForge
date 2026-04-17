"use client";

import { useCallback, useState } from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Endpoint } from "@/types/api";
import { getSpecUrlValidationError } from "@/lib/validate-swagger-url";

export function useSwaggerParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setEndpoints = useWorkspaceStore((s) => s.setEndpoints);
  const setParseError = useWorkspaceStore((s) => s.setParseError);
  const setSpecMeta = useWorkspaceStore((s) => s.setSpecMeta);

  const parseUrl = useCallback(
    async (url: string) => {
      const clientErr = getSpecUrlValidationError(url);
      if (clientErr) {
        setError(clientErr);
        setParseError(clientErr);
        return;
      }
      setIsLoading(true);
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
          version?: string;
          serverUrls?: string[];
        };
        if (!res.ok || !data.success || !data.endpoints) {
          throw new Error(data.error || "Parse failed");
        }
        setEndpoints(
          data.endpoints,
          Array.isArray(data.serverUrls) ? data.serverUrls : undefined,
        );
        setSpecMeta(
          typeof data.title === "string" ? data.title : null,
          typeof data.version === "string" ? data.version : null,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Parse failed";
        setError(msg);
        setParseError(msg);
        setSpecMeta(null, null);
      } finally {
        setIsLoading(false);
      }
    },
    [setEndpoints, setParseError, setSpecMeta],
  );

  const parseFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
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
          version?: string;
          serverUrls?: string[];
        };
        if (!res.ok || !data.success || !data.endpoints) {
          throw new Error(data.error || "Parse failed");
        }
        setEndpoints(
          data.endpoints,
          Array.isArray(data.serverUrls) ? data.serverUrls : undefined,
        );
        setSpecMeta(
          typeof data.title === "string" ? data.title : null,
          typeof data.version === "string" ? data.version : null,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Parse failed";
        setError(msg);
        setParseError(msg);
        setSpecMeta(null, null);
      } finally {
        setIsLoading(false);
      }
    },
    [setEndpoints, setParseError, setSpecMeta],
  );

  return { parseUrl, parseFile, isLoading, error };
}
