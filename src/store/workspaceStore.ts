import { create } from "zustand";
import type { Endpoint } from "@/types/api";
import type { OutputTab } from "@/types/api";

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
  parseError: string | null;
  lastGenerationMs: number | null;
  /** Spec metadata from last successful parse */
  specTitle: string | null;
  specVersion: string | null;
  /** URL field (header + landing) */
  specUrlInput: string;
  endpointSearch: string;
  /** Empty = no method filter (show all) */
  methodFilters: MethodFilterKey[];
  mobileSidebarOpen: boolean;
  setEndpoints: (e: Endpoint[]) => void;
  setActiveEndpoint: (e: Endpoint | null) => void;
  setActiveTab: (t: OutputTab) => void;
  setParseError: (msg: string | null) => void;
  setLastGenerationMs: (ms: number | null) => void;
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
  parseError: null as string | null,
  lastGenerationMs: null as number | null,
  specTitle: null as string | null,
  specVersion: null as string | null,
  specUrlInput: "",
  endpointSearch: "",
  methodFilters: [] as MethodFilterKey[],
  mobileSidebarOpen: false,
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initial,
  setEndpoints: (endpoints) =>
    set({
      endpoints,
      parseError: null,
      activeEndpoint: endpoints.length ? endpoints[0]! : null,
    }),
  setActiveEndpoint: (activeEndpoint) => set({ activeEndpoint }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setParseError: (parseError) => set({ parseError }),
  setLastGenerationMs: (lastGenerationMs) => set({ lastGenerationMs }),
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
