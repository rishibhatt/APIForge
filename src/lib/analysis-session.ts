import type { ApiScoreResult } from "@/lib/api-quality-score/types";

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
};

export function persistAnalysisPayload(payload: StoredAnalysisPayload): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  try {
    sessionStorage.setItem(
      ANALYSIS_STORAGE_PREFIX + id,
      JSON.stringify(payload),
    );
  } catch {
    /* quota or private mode */
  }
  return id;
}

export function readAnalysisPayload(id: string): StoredAnalysisPayload | null {
  if (typeof sessionStorage === "undefined") return null;
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
