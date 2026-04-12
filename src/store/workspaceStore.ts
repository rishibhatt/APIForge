import { create } from "zustand";
import type { Endpoint } from "@/types/api";
import type { OutputTab } from "@/types/api";

export interface WorkspaceState {
  endpoints: Endpoint[];
  activeEndpoint: Endpoint | null;
  activeTab: OutputTab;
  parseError: string | null;
  lastGenerationMs: number | null;
  setEndpoints: (e: Endpoint[]) => void;
  setActiveEndpoint: (e: Endpoint | null) => void;
  setActiveTab: (t: OutputTab) => void;
  setParseError: (msg: string | null) => void;
  setLastGenerationMs: (ms: number | null) => void;
}

const initial = {
  endpoints: [] as Endpoint[],
  activeEndpoint: null as Endpoint | null,
  activeTab: "typescript" as OutputTab,
  parseError: null as string | null,
  lastGenerationMs: null as number | null,
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  ...initial,
  setEndpoints: (endpoints) =>
    set({
      endpoints,
      parseError: null,
      activeEndpoint: endpoints.length ? endpoints[0] : null,
    }),
  setActiveEndpoint: (activeEndpoint) => set({ activeEndpoint }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setParseError: (parseError) => set({ parseError }),
  setLastGenerationMs: (lastGenerationMs) => set({ lastGenerationMs }),
}));
