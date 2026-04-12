"use client";

import { useMemo } from "react";
import type { Endpoint } from "@/types/api";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function useFilteredEndpoints(): Endpoint[] {
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const search = useWorkspaceStore((s) => s.endpointSearch);
  const methodFilters = useWorkspaceStore((s) => s.methodFilters);

  return useMemo(() => {
    const q = search.trim().toLowerCase();
    return endpoints.filter((ep) => {
      if (methodFilters.length > 0) {
        const upper = ep.method.toUpperCase();
        if (!methodFilters.some((m) => m === upper)) return false;
      }
      if (!q) return true;
      const path = ep.path.toLowerCase();
      const summary = ep.summary?.toLowerCase() ?? "";
      return (
        path.includes(q) ||
        summary.includes(q) ||
        ep.method.toLowerCase().includes(q)
      );
    });
  }, [endpoints, search, methodFilters]);
}
