import { create } from "zustand";
import type { Endpoint } from "@/types/api";
import type { OutputTab } from "@/types/api";

export interface WorkspaceState {
  endpoints: Endpoint[];
  activeEndpoint: Endpoint | null;
  activeTab: OutputTab;
  parseError: string | null;
  isParsing: boolean;
  specTitle: string | null;
  lastGenerationMs: number | null;
  setEndpoints: (e: Endpoint[], meta?: { title?: string | null }) => void;
  setActiveEndpoint: (e: Endpoint | null) => void;
  setActiveTab: (t: OutputTab) => void;
  setParseError: (msg: string | null) => void;
  setParsing: (v: boolean) => void;
  setLastGenerationMs: (ms: number | null) => void;
  reset: () => void;
}

const initial = {
  endpoints: [] as Endpoint[],
  activeEndpoint: null as Endpoint | null,
  activeTab: "typescript" as OutputTab,
  parseError: null as string | null,
  isParsing: false,
  specTitle: null as string | null,
  lastGenerationMs: null as number | null,
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  ...initial,
  setEndpoints: (endpoints, meta) =>
    set({
      endpoints,
      specTitle: meta?.title ?? null,
      parseError: null,
      activeEndpoint: endpoints.length ? endpoints[0] : null,
    }),
  setActiveEndpoint: (activeEndpoint) => set({ activeEndpoint }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setParseError: (parseError) => set({ parseError }),
  setParsing: (isParsing) => set({ isParsing }),
  setLastGenerationMs: (lastGenerationMs) => set({ lastGenerationMs }),
  reset: () => set(initial),
}));
