import { create } from "zustand";
import { groupEndpointsByTag } from "@/lib/extract-endpoints";
import {
  getScopedEndpoints as computeScopedEndpoints,
  getScopeLabel as computeScopeLabel,
  primaryTag,
} from "@/lib/endpoint-groups";
import type { AIMetadata, AITokenUsage, GroqTokenUsage } from "@/lib/groq-token-usage";
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
  /** Last AI call token usage (from response headers) */
  lastAiUsage: AITokenUsage | null;
  /** Backward-compatible alias for lastAiUsage */
  lastGroqUsage: GroqTokenUsage | null;
  /** Last model name used to answer request */
  lastAiModel: string | null;
  /** Last provider used */
  lastAiProvider: string | null;
  /** Whether automatic model/provider fallback occurred */
  lastAiFallbackUsed: boolean;
  /** Models attempted in fallback chain */
  lastAiAttempts: string[];
  /** Spec metadata from last successful parse */
  specTitle: string | null;
  specVersion: string | null;
  /** From OpenAPI servers / Swagger host — for Run API defaults */
  specServerUrls: string[];
  /** `components.securitySchemes` from parsed spec */
  specSecuritySchemes: Record<string, unknown> | null;
  /** URL field (header + landing) */
  specUrlInput: string;
  /** Optional Bearer applied to every Run API request when Authorization is unset */
  workspaceDefaultBearer: string;
  endpointSearch: string;
  /** Empty = no method filter (show all) */
  methodFilters: MethodFilterKey[];
  mobileSidebarOpen: boolean;
  /** Hides explorer sidebar, collection list, and schema rail for a wider editor */
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toggleFocusMode: () => void;
  qualityScoreModalOpen: boolean;
  setQualityScoreModalOpen: (v: boolean) => void;
  /** Buy me a coffee / Support modal */
  supportModalOpen: boolean;
  setSupportModalOpen: (v: boolean) => void;
  toggleSupportModal: () => void;
  /** OpenAPI tag key for middle column endpoint list (e.g. "Auth") */
  selectedCollectionTag: string | null;
  setSelectedCollectionTag: (tag: string | null) => void;
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
  setLastAiUsage: (u: AITokenUsage | null) => void;
  setLastGroqUsage: (u: GroqTokenUsage | null) => void;
  setLastAiMeta: (meta: Partial<AIMetadata>) => void;
  setSpecMeta: (title: string | null, version: string | null) => void;
  setSpecUrlInput: (s: string) => void;
  setWorkspaceDefaultBearer: (s: string) => void;
  setEndpointSearch: (s: string) => void;
  toggleMethodFilter: (m: MethodFilterKey) => void;
  clearMethodFilters: () => void;
  clearWorkspace: () => void;
  setMobileSidebarOpen: (v: boolean) => void;
}

const initial = {
  endpoints: [] as Endpoint[],
  activeEndpoint: null as Endpoint | null,
  activeTab: "runApi" as OutputTab,
  generationScope: "endpoint" as GenerationScope,
  parseError: null as string | null,
  lastGenerationMs: null as number | null,
  lastAiUsage: null as AITokenUsage | null,
  lastGroqUsage: null as GroqTokenUsage | null,
  lastAiModel: null as string | null,
  lastAiProvider: null as string | null,
  lastAiFallbackUsed: false,
  lastAiAttempts: [] as string[],
  specTitle: null as string | null,
  specVersion: null as string | null,
  specServerUrls: [] as string[],
  specSecuritySchemes: null as Record<string, unknown> | null,
  specUrlInput: "",
  workspaceDefaultBearer: "",
  endpointSearch: "",
  methodFilters: [] as MethodFilterKey[],
  mobileSidebarOpen: false,
  focusMode: false,
  qualityScoreModalOpen: false,
  supportModalOpen: false,
  selectedCollectionTag: null as string | null,
};

function firstCollectionTag(endpoints: Endpoint[]): string | null {
  const g = groupEndpointsByTag(endpoints);
  const first = g.keys().next().value;
  return typeof first === "string" ? first : null;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initial,
  setEndpoints: (endpoints, serverUrls, securitySchemes) => {
    const tag = endpoints.length ? firstCollectionTag(endpoints) : null;
    const firstEp = endpoints.length ? endpoints[0]! : null;
    set({
      endpoints,
      parseError: null,
      activeEndpoint: firstEp,
      selectedCollectionTag: tag,
      specServerUrls: serverUrls?.length ? serverUrls : [],
      specSecuritySchemes:
        securitySchemes && Object.keys(securitySchemes).length > 0
          ? securitySchemes
          : null,
    });
  },
  setActiveEndpoint: (activeEndpoint) =>
    set({
      activeEndpoint,
      selectedCollectionTag: activeEndpoint
        ? primaryTag(activeEndpoint) ?? "default"
        : null,
    }),
  setSelectedCollectionTag: (selectedCollectionTag) =>
    set({ selectedCollectionTag }),
  setActiveTab: (activeTab) => {
    const t = activeTab as string;
    if (t === "runApi") {
      set({ activeTab: "runApi" });
      return;
    }
    if (t === "testGeneration") {
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
  setLastAiUsage: (usage) => set({ lastAiUsage: usage, lastGroqUsage: usage }),
  setLastGroqUsage: (lastGroqUsage) =>
    set({ lastAiUsage: lastGroqUsage, lastGroqUsage }),
  setLastAiMeta: (meta) =>
    set((s) => ({
      lastAiUsage: meta.usage !== undefined ? meta.usage : s.lastAiUsage,
      lastGroqUsage: meta.usage !== undefined ? meta.usage : s.lastGroqUsage,
      lastAiModel: meta.model !== undefined ? meta.model : s.lastAiModel,
      lastAiProvider: meta.provider !== undefined ? meta.provider : s.lastAiProvider,
      lastAiFallbackUsed:
        meta.fallbackUsed !== undefined ? meta.fallbackUsed : s.lastAiFallbackUsed,
      lastAiAttempts: meta.attempts !== undefined ? meta.attempts : s.lastAiAttempts,
    })),
  setSpecMeta: (specTitle, specVersion) => set({ specTitle, specVersion }),
  setSpecUrlInput: (specUrlInput) => set({ specUrlInput }),
  setWorkspaceDefaultBearer: (workspaceDefaultBearer) =>
    set({ workspaceDefaultBearer }),
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
  setFocusMode: (focusMode) => set({ focusMode }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setQualityScoreModalOpen: (qualityScoreModalOpen) =>
    set({ qualityScoreModalOpen }),
  setSupportModalOpen: (supportModalOpen) => set({ supportModalOpen }),
  toggleSupportModal: () => set((s) => ({ supportModalOpen: !s.supportModalOpen })),
  clearWorkspace: () =>
    set({
      ...initial,
      focusMode: false,
      qualityScoreModalOpen: false,
      supportModalOpen: false,
      selectedCollectionTag: null,
    }),
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
