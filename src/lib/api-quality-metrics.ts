import type { Endpoint } from "@/types/api";

export type ApiQualityReport = {
  /** 0–10 */
  score: number;
  certification: "draft" | "certified" | "strong";
  duplicateOperations: { method: string; path: string; count: number }[];
  summaryLines: string[];
};

function normPath(p: string): string {
  return p.replace(/\s+/g, "").toLowerCase();
}

function hasJsonSuccessResponse(ep: Endpoint): boolean {
  const r = ep.responses;
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  for (const code of Object.keys(o)) {
    const n = Number(code);
    if (!Number.isFinite(n) || n < 200 || n >= 300) continue;
    const block = o[code];
    if (!block || typeof block !== "object") continue;
    const content = (block as { content?: unknown }).content;
    if (!content || typeof content !== "object") continue;
    const c = content as Record<string, unknown>;
    if ("application/json" in c || "application/*+json" in c) return true;
  }
  return false;
}

function hasErrorResponse(ep: Endpoint): boolean {
  const r = ep.responses;
  if (!r || typeof r !== "object") return false;
  for (const code of Object.keys(r)) {
    const n = Number(code);
    if (Number.isFinite(n) && n >= 400) return true;
  }
  return false;
}

function pathNamingScore(path: string): number {
  const lower = path.toLowerCase();
  if (lower.includes(" ") || lower.includes("__")) return 0;
  if (/\/[A-Z]/.test(path)) return 0.3;
  return 1;
}

/**
 * Lightweight, deterministic API quality heuristics from the parsed spec only.
 */
export function computeApiQuality(endpoints: Endpoint[]): ApiQualityReport {
  if (endpoints.length === 0) {
    return {
      score: 0,
      certification: "draft",
      duplicateOperations: [],
      summaryLines: ["Load a spec to compute quality."],
    };
  }

  const withTags = endpoints.filter((e) => (e.tags?.length ?? 0) > 0).length;
  const tagRatio = withTags / endpoints.length;

  const schemaCov = endpoints.filter(hasJsonSuccessResponse).length;
  const schemaRatio = schemaCov / endpoints.length;

  const errCov = endpoints.filter(hasErrorResponse).length;
  const errRatio = errCov / endpoints.length;

  const pathScores =
    endpoints.reduce((a, e) => a + pathNamingScore(e.path), 0) /
    endpoints.length;

  const keyCounts = new Map<string, number>();
  for (const e of endpoints) {
    const k = `${e.method.toUpperCase()} ${normPath(e.path)}`;
    keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
  }
  const duplicateOperations = Array.from(keyCounts.entries())
    .filter(([, n]) => n > 1)
    .map(([k, count]) => {
      const [method, ...rest] = k.split(" ");
      return { method, path: rest.join(" "), count };
    });

  const dupPenalty = Math.min(3, duplicateOperations.length * 0.8);

  let score =
    schemaRatio * 3.5 +
    errRatio * 2.2 +
    tagRatio * 1.5 +
    pathScores * 1.8 -
    dupPenalty;
  score = Math.max(0, Math.min(10, score));

  const certification: ApiQualityReport["certification"] =
    score >= 8 ? "strong" : score >= 5.5 ? "certified" : "draft";

  const summaryLines: string[] = [
    `Documented JSON for 2xx: ${Math.round(schemaRatio * 100)}% of operations`,
    `Error responses (4xx/5xx): ${Math.round(errRatio * 100)}%`,
    `Tagged operations: ${Math.round(tagRatio * 100)}%`,
  ];
  if (duplicateOperations.length) {
    summaryLines.push(
      `${duplicateOperations.length} duplicate method+path entries detected`,
    );
  }

  return {
    score: Math.round(score * 10) / 10,
    certification,
    duplicateOperations,
    summaryLines,
  };
}
