import { useEffect, useState } from "react";
import type { ApiScoreResult } from "@/lib/api-quality-score/types";
import { useWorkspaceStore } from "@/store/workspaceStore";

export const ANALYSIS_STORAGE_PREFIX = "apiforge-analysis:";

/** Serialized operations for downstream tools (e.g. Auto Fix). Optional for older sessions. */
export type StoredAnalysisEndpoint = {
  path: string;
  method: string;
};

export type StoredAnalysisPayload = {
  result: ApiScoreResult;
  specTitle: string | null;
  createdAt: number;
  endpoints?: StoredAnalysisEndpoint[];
  /**
   * The spec URL the workspace had loaded. Lets the analysis and auto-fix pages
   * link back to `/?spec=<url>`, which re-opens the same spec after a refresh.
   * Optional for older sessions and for file uploads.
   */
  specUrl?: string | null;
};

/** Query param the analysis and auto-fix pages carry so the URL alone can reopen the spec. */
export const SPEC_QUERY_PARAM = "spec";

export function isHttpSpecUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim());
}

/** The spec URL currently loaded in the workspace store, when it is a fetchable URL. */
function liveWorkspaceSpecUrl(): string | null {
  try {
    const s = useWorkspaceStore.getState();
    if (!s.endpoints.length) return null;
    return isHttpSpecUrl(s.specUrlInput) ? s.specUrlInput.trim() : null;
  } catch {
    return null;
  }
}

export function persistAnalysisPayload(payload: StoredAnalysisPayload): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const specUrl =
    payload.specUrl !== undefined ? payload.specUrl : liveWorkspaceSpecUrl();
  try {
    sessionStorage.setItem(
      ANALYSIS_STORAGE_PREFIX + id,
      JSON.stringify({ ...payload, specUrl }),
    );
  } catch {
    /* quota or private mode */
  }
  return id;
}

export function readAnalysisPayload(id: string): StoredAnalysisPayload | null {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(ANALYSIS_STORAGE_PREFIX + id);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredAnalysisPayload;
    if (!data || typeof data !== "object" || !data.result) return null;
    return data;
  } catch {
    return null;
  }
}

/** `/?spec=<url>` when the URL is known (the landing page re-parses it), otherwise `/`. */
export function workspaceHref(specUrl: string | null | undefined): string {
  return isHttpSpecUrl(specUrl)
    ? `/?${SPEC_QUERY_PARAM}=${encodeURIComponent(specUrl.trim())}`
    : "/";
}

/** Appends `?spec=<url>` to an in-app path when the spec URL is known. */
export function withSpecQuery(path: string, specUrl: string | null | undefined): string {
  return isHttpSpecUrl(specUrl)
    ? `${path}?${SPEC_QUERY_PARAM}=${encodeURIComponent(specUrl.trim())}`
    : path;
}

export type AnalysisSessionState =
  | { status: "loading"; specUrl: string | null }
  | { status: "ready"; payload: StoredAnalysisPayload; specUrl: string | null }
  | { status: "missing"; specUrl: string | null };

/**
 * Reads the stored analysis after mount. Session storage does not exist on the
 * server, so reading it during render would make the server HTML (empty state)
 * disagree with the client (full report) and break hydration on refresh.
 *
 * Also resolves the spec URL from the payload, the `?spec=` query, or the live
 * workspace, and writes it into the address bar so a copied link or a new tab
 * can still reopen the spec when the session itself is gone.
 */
export function useAnalysisSession(id: string): AnalysisSessionState {
  const [state, setState] = useState<AnalysisSessionState>({
    status: "loading",
    specUrl: null,
  });

  useEffect(() => {
    const payload = readAnalysisPayload(id);
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get(SPEC_QUERY_PARAM);
    const specUrl =
      (isHttpSpecUrl(payload?.specUrl) ? payload!.specUrl!.trim() : null) ??
      (isHttpSpecUrl(fromQuery) ? fromQuery.trim() : null) ??
      liveWorkspaceSpecUrl();

    let timer: number | undefined;
    if (specUrl && fromQuery !== specUrl) {
      params.set(SPEC_QUERY_PARAM, specUrl);
      const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      // Deferred: on a hard load this effect runs before the App Router installs its
      // history patch (parent effects run after children). Calling it later, with
      // `null` state, lets the router adopt the URL so re-renders keep `?spec=`.
      timer = window.setTimeout(() => window.history.replaceState(null, "", next), 0);
    }

    setState(
      payload
        ? { status: "ready", payload, specUrl }
        : { status: "missing", specUrl },
    );
    return () => window.clearTimeout(timer);
  }, [id]);

  return state;
}

/**
 * Where "Back to workspace" should go. A workspace still held in memory (client
 * navigation from `/`) is reused as is; otherwise the spec URL deep link reloads it.
 */
export function useWorkspaceReturnHref(specUrl: string | null): string {
  const liveCount = useWorkspaceStore((s) => s.endpoints.length);
  const liveSpec = useWorkspaceStore((s) => s.specUrlInput);
  if (liveCount > 0) return workspaceHref(isHttpSpecUrl(liveSpec) ? liveSpec : null);
  return workspaceHref(specUrl);
}
