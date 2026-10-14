import { create } from "zustand";
import { groupEndpointsByTag } from "@/lib/extract-endpoints";
import { primaryTag } from "@/lib/endpoint-groups";
import type { AIMetadata, AITokenUsage, GroqTokenUsage } from "@/lib/groq-token-usage";
import type { Endpoint, SpecChoice } from "@/types/api";
import { EMPTY_AUTH_HEADER, type AuthHeader } from "@/lib/spec-auth-header";
import type { GenerationScope, OutputTab } from "@/types/api";
import type { ExecutionMode } from "@/types/execution";
import type { ParseErrorInfo } from "@/lib/parse-error-info";
import { clearSpecFromAddressBar } from "@/lib/spec-deeplink";

export type ParsePhase = "idle" | "fetching" | "parsing" | "done" | "error";

/** What the spec loader is doing right now; read by the landing form and the workspace header. */
export interface ParseProgress {
  phase: ParsePhase;
  url: string;
  endpointCount: number | null;
  error: ParseErrorInfo | null;
}

/** A body handed to Run API from elsewhere (e.g. the AI payload generator). */
export interface PendingRequestBody {
  endpointId: string;
  text: string;
  nonce: number;
}

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
  /** Optional header sent with the spec fetch (docs behind auth). Memory only. */
  specAuthHeader: AuthHeader;
  /** Specs listed by the Swagger UI page that was pasted (definition dropdown); empty when only one. */
  availableSpecs: SpecChoice[];
  /** Raw spec URL currently loaded, when known. */
  activeSpecUrl: string | null;
  /** Optional Bearer applied to every Run API request when Authorization is unset */
  workspaceDefaultBearer: string;
  endpointSearch: string;
  executionMode: ExecutionMode;
  setExecutionMode: (mode: ExecutionMode) => void;
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
  setSpecAuthHeader: (h: AuthHeader) => void;
  setSpecChoices: (available: SpecChoice[], activeSpecUrl: string | null) => void;
  setWorkspaceDefaultBearer: (s: string) => void;
  setEndpointSearch: (s: string) => void;
  toggleMethodFilter: (m: MethodFilterKey) => void;
  clearMethodFilters: () => void;
  clearWorkspace: () => void;
  setMobileSidebarOpen: (v: boolean) => void;
  parseProgress: ParseProgress;
  setParseProgress: (p: Partial<ParseProgress>) => void;
  pendingRequestBody: PendingRequestBody | null;
  setPendingRequestBody: (endpointId: string, text: string) => void;
  clearPendingRequestBody: () => void;
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
  specAuthHeader: EMPTY_AUTH_HEADER,
  availableSpecs: [] as SpecChoice[],
  activeSpecUrl: null as string | null,
  workspaceDefaultBearer: "",
  endpointSearch: "",
  executionMode: "AUTO" as ExecutionMode,
  methodFilters: [] as MethodFilterKey[],
  mobileSidebarOpen: false,
  focusMode: false,
  qualityScoreModalOpen: false,
  supportModalOpen: false,
  selectedCollectionTag: null as string | null,
  parseProgress: {
    phase: "idle",
    url: "",
    endpointCount: null,
    error: null,
  } as ParseProgress,
  pendingRequestBody: null as PendingRequestBody | null,
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
  setSpecAuthHeader: (specAuthHeader) => set({ specAuthHeader }),
  setSpecChoices: (availableSpecs, activeSpecUrl) => set({ availableSpecs, activeSpecUrl }),
  setWorkspaceDefaultBearer: (workspaceDefaultBearer) =>
    set({ workspaceDefaultBearer }),
  setEndpointSearch: (endpointSearch) => set({ endpointSearch }),
  setExecutionMode: (executionMode) => set({ executionMode }),
  toggleMethodFilter: (m) => {
    const cur = get().methodFilters;
    const has = cur.includes(m);
    set({
      methodFilters: has ? cur.filter((x) => x !== m) : [...cur, m],
    });
  },
  clearMethodFilters: () => set({ methodFilters: [] }),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  setParseProgress: (p) => set((s) => ({ parseProgress: { ...s.parseProgress, ...p } })),
  setPendingRequestBody: (endpointId, text) =>
    set({ pendingRequestBody: { endpointId, text, nonce: Date.now() } }),
  clearPendingRequestBody: () => set({ pendingRequestBody: null }),
  setFocusMode: (focusMode) => set({ focusMode }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setQualityScoreModalOpen: (qualityScoreModalOpen) =>
    set({ qualityScoreModalOpen }),
  setSupportModalOpen: (supportModalOpen) => set({ supportModalOpen }),
  toggleSupportModal: () => set((s) => ({ supportModalOpen: !s.supportModalOpen })),
  clearWorkspace: () => {
    clearSpecFromAddressBar();
    set({
      ...initial,
      focusMode: false,
      qualityScoreModalOpen: false,
      supportModalOpen: false,
      selectedCollectionTag: null,
    });
  },
}));

export { HTTP_METHODS_FILTER };
