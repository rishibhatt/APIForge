import { create } from "zustand";
import {
  getScopedEndpoints as computeScopedEndpoints,
  getScopeLabel as computeScopeLabel,
} from "@/lib/endpoint-groups";
import type { GroqTokenUsage } from "@/lib/groq-token-usage";
import type { Endpoint } from "@/types/api";
import type { GenerationScope, OutputTab } from "@/types/api";

const HTTP_METHODS_FILTER = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type MethodFilterKey = (typeof HTTP_METHODS_FILTER)[number];

export interface WorkspaceState {
  endpoints: Endpoint[];
  activeEndpoint: Endpoint | null;
  activeTab: OutputTab;
  generationScope: GenerationScope;
  parseError: string | null;
  lastGenerationMs: number | null;
  /** Last Groq call token usage (from response headers), if reported by the SDK */
  lastGroqUsage: GroqTokenUsage | null;
  /** Spec metadata from last successful parse */
  specTitle: string | null;
  specVersion: string | null;
  /** From OpenAPI servers / Swagger host — for Run API defaults */
  specServerUrls: string[];
  /** `components.securitySchemes` from parsed spec */
  specSecuritySchemes: Record<string, unknown> | null;
  /** URL field (header + landing) */
  specUrlInput: string;
  endpointSearch: string;
  /** Empty = no method filter (show all) */
  methodFilters: MethodFilterKey[];
  mobileSidebarOpen: boolean;
  setEndpoints: (
    e: Endpoint[],
    serverUrls?: string[],
    securitySchemes?: Record<string, unknown>,
  ) => void;
  setActiveEndpoint: (e: Endpoint | null) => void;
  setActiveTab: (t: OutputTab) => void;
  setGenerationScope: (s: GenerationScope) => void;
  setParseError: (msg: string | null) => void;
  setLastGenerationMs: (ms: number | null) => void;
  setLastGroqUsage: (u: GroqTokenUsage | null) => void;
  setSpecMeta: (title: string | null, version: string | null) => void;
  setSpecUrlInput: (s: string) => void;
  setEndpointSearch: (s: string) => void;
  toggleMethodFilter: (m: MethodFilterKey) => void;
  clearMethodFilters: () => void;
  clearWorkspace: () => void;
  setMobileSidebarOpen: (v: boolean) => void;
}

const initial = {
  endpoints: [] as Endpoint[],
  activeEndpoint: null as Endpoint | null,
  activeTab: "typescript" as OutputTab,
  generationScope: "endpoint" as GenerationScope,
  parseError: null as string | null,
  lastGenerationMs: null as number | null,
  lastGroqUsage: null as GroqTokenUsage | null,
  specTitle: null as string | null,
  specVersion: null as string | null,
  specServerUrls: [] as string[],
  specSecuritySchemes: null as Record<string, unknown> | null,
  specUrlInput: "",
  endpointSearch: "",
  methodFilters: [] as MethodFilterKey[],
  mobileSidebarOpen: false,
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initial,
  setEndpoints: (endpoints, serverUrls, securitySchemes) =>
    set({
      endpoints,
      parseError: null,
      activeEndpoint: endpoints.length ? endpoints[0]! : null,
      specServerUrls: serverUrls?.length ? serverUrls : [],
      specSecuritySchemes:
        securitySchemes && Object.keys(securitySchemes).length > 0
          ? securitySchemes
          : null,
    }),
  setActiveEndpoint: (activeEndpoint) => set({ activeEndpoint }),
  setActiveTab: (activeTab) => {
    const t = activeTab as string;
    if (t === "runApi") {
      set({ activeTab: "runApi" });
      return;
    }
    if (t === "markdown" || t === "snippet") {
      set({ activeTab: "typescript" });
    } else {
      set({ activeTab });
    }
  },
  setGenerationScope: (generationScope) => set({ generationScope }),
  setParseError: (parseError) => set({ parseError }),
  setLastGenerationMs: (lastGenerationMs) => set({ lastGenerationMs }),
  setLastGroqUsage: (lastGroqUsage) => set({ lastGroqUsage }),
  setSpecMeta: (specTitle, specVersion) => set({ specTitle, specVersion }),
  setSpecUrlInput: (specUrlInput) => set({ specUrlInput }),
  setEndpointSearch: (endpointSearch) => set({ endpointSearch }),
  toggleMethodFilter: (m) => {
    const cur = get().methodFilters;
    const has = cur.includes(m);
    set({
      methodFilters: has ? cur.filter((x) => x !== m) : [...cur, m],
    });
  },
  clearMethodFilters: () => set({ methodFilters: [] }),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  clearWorkspace: () => set({ ...initial }),
}));

export { HTTP_METHODS_FILTER };

export function getScopedEndpoints(state: WorkspaceState): Endpoint[] {
  return computeScopedEndpoints(
    state.endpoints,
    state.activeEndpoint,
    state.generationScope,
  );
}

export function getScopeLabel(state: WorkspaceState): string {
  const scoped = getScopedEndpoints(state);
  return computeScopeLabel(
    state.endpoints,
    state.activeEndpoint,
    state.generationScope,
    scoped,
  );
}
