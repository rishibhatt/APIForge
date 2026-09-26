import type { ApiIssue, ApiScoreResult, NormalizedEndpoint } from "./types";
import { detectApiIssues } from "./issueDetector";

const MAX = {
  naming: 20,
  http: 20,
  structure: 15,
  consistency: 15,
  versioning: 10,
  errorHandling: 10,
  documentation: 10,
} as const;

function segments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

const VERB_SEGMENTS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "create",
  "update",
  "remove",
  "fetch",
  "list",
  "add",
  "edit",
  "save",
]);

function verbLikeSegment(path: string): boolean {
  for (const seg of segments(path)) {
    if (seg.startsWith("{")) continue;
    if (VERB_SEGMENTS.has(seg.toLowerCase())) return true;
  }
  return false;
}

function hasCamelCaseInPath(path: string): boolean {
  return /\/[a-z][A-Z]|_[a-z]/.test(path) || /[a-z][A-Z]/.test(path);
}

function hasUnderscoreSegment(path: string): boolean {
  return segments(path).some((s) => !s.startsWith("{") && s.includes("_"));
}

function hasJsonBody(ep: NormalizedEndpoint): boolean {
  const b = ep.requestBody;
  if (!b || typeof b !== "object") return false;
  const content = (b as { content?: unknown }).content;
  return !!content && typeof content === "object";
}

function pathDepth(path: string): number {
  return segments(path).length;
}

function hasVersionPrefix(paths: string[]): boolean {
  return paths.some((p) =>
    segments(p).some((s) => /^v\d+$/i.test(s)),
  );
}

function hasErrorRangeDeclared(ep: NormalizedEndpoint): boolean {
  const r = ep.responses;
  if (!r || typeof r !== "object") return false;
  for (const code of Object.keys(r)) {
    const n = Number(code);
    if (Number.isFinite(n) && n >= 400) return true;
    if (code === "default") return true;
  }
  return false;
}

function hasAnyResponses(ep: NormalizedEndpoint): boolean {
  return ep.responses !== undefined && typeof ep.responses === "object";
}

function scoreNaming(endpoints: NormalizedEndpoint[]): number {
  if (endpoints.length === 0) return 0;
  let sum = 0;
  for (const ep of endpoints) {
    let q = 1;
    if (hasCamelCaseInPath(ep.path)) q -= 0.45;
    if (hasUnderscoreSegment(ep.path)) q -= 0.35;
    if (verbLikeSegment(ep.path)) q -= 0.55;
    sum += Math.max(0, q);
  }
  return (sum / endpoints.length) * MAX.naming;
}

function scoreHttp(endpoints: NormalizedEndpoint[]): number {
  if (endpoints.length === 0) return 0;
  let sum = 0;
  const actionInPath = /\/(create|update|delete|remove|get|fetch|add|save)\b/i;
  for (const ep of endpoints) {
    let q = 1;
    if (ep.method === "GET" && hasJsonBody(ep)) q -= 1;
    if (actionInPath.test(ep.path)) q -= 0.45;
    sum += Math.max(0, q);
  }
  return (sum / endpoints.length) * MAX.http;
}

function scoreStructure(endpoints: NormalizedEndpoint[]): number {
  if (endpoints.length === 0) return 0;
  let sum = 0;
  for (const ep of endpoints) {
    const d = pathDepth(ep.path);
    let q = 1;
    if (d > 3) q -= Math.min(0.9, (d - 3) * 0.22);
    sum += Math.max(0, q);
  }
  return (sum / endpoints.length) * MAX.structure;
}

function scoreConsistency(endpoints: NormalizedEndpoint[]): number {
  if (endpoints.length === 0) return 0;
  const paths = endpoints.map((e) => e.path);
  let penalty = 0;

  const keyCount = new Map<string, number>();
  for (const ep of endpoints) {
    const k = `${ep.method}\t${ep.path}`;
    keyCount.set(k, (keyCount.get(k) ?? 0) + 1);
  }
  for (const n of Array.from(keyCount.values())) {
    if (n > 1) penalty += 0.45;
  }

  const tokens = new Map<string, number>();
  for (const p of paths) {
    for (const seg of segments(p)) {
      if (seg.startsWith("{")) continue;
      if (/^v\d+$/i.test(seg)) continue;
      if (seg === "api" || seg === "apis") continue;
      const key = seg.toLowerCase();
      tokens.set(key, (tokens.get(key) ?? 0) + 1);
    }
  }
  let mixedSingularPlural = false;
  for (const key of Array.from(tokens.keys())) {
    if (key.length < 3 || !key.endsWith("s")) continue;
    const singular = key.slice(0, -1);
    if (singular.length < 2) continue;
    if (tokens.has(singular)) {
      const hasA = paths.some((p) =>
        segments(p).some((s) => s.toLowerCase() === singular),
      );
      const hasB = paths.some((p) =>
        segments(p).some((s) => s.toLowerCase() === key),
      );
      if (hasA && hasB) {
        mixedSingularPlural = true;
        break;
      }
    }
  }
  if (mixedSingularPlural) penalty += 0.5;

  const q = Math.max(0, 1 - Math.min(1, penalty));
  return q * MAX.consistency;
}

function scoreVersioning(paths: string[]): number {
  return hasVersionPrefix(paths) ? MAX.versioning : MAX.versioning * 0.1;
}

function scoreErrorHandling(endpoints: NormalizedEndpoint[]): number {
  const withSpec = endpoints.filter(hasAnyResponses);
  if (withSpec.length === 0) {
    return MAX.errorHandling * 0.2;
  }
  let ok = 0;
  for (const ep of withSpec) {
    if (hasErrorRangeDeclared(ep)) ok += 1;
  }
  return (ok / withSpec.length) * MAX.errorHandling;
}

function scoreDocumentation(endpoints: NormalizedEndpoint[]): number {
  if (endpoints.length === 0) return 0;
  const withDesc = endpoints.filter((e) => e.description.trim().length > 0);
  return (withDesc.length / endpoints.length) * MAX.documentation;
}

function buildSuggestions(issues: ApiIssue[]): string[] {
  const s = new Set<string>();
  if (issues.some((i) => i.type === "versioning")) {
    s.add("Add explicit major version segments (e.g. /v1) or document a version header across all operations.");
  }
  if (issues.some((i) => i.type === "errorHandling")) {
    s.add("Model standard error responses (400, 404, 500) with a shared error schema.");
  }
  if (issues.some((i) => i.type === "naming")) {
    s.add("Use plural nouns for collections and kebab-case for multi-word path segments.");
  }
  if (issues.some((i) => i.type === "documentation")) {
    s.add("Fill in operation summaries so consumers understand intent without reading schemas.");
  }
  return Array.from(s);
}

/**
 * Deterministic 0–100 API quality score from normalized endpoints (no network, no LLM).
 */
export function calculateApiScore(
  endpoints: NormalizedEndpoint[],
): ApiScoreResult {
  const issues = detectApiIssues(endpoints);

  const paths = endpoints.map((e) => e.path);
  const breakdown = {
    naming: Math.round(scoreNaming(endpoints) * 10) / 10,
    http: Math.round(scoreHttp(endpoints) * 10) / 10,
    structure: Math.round(scoreStructure(endpoints) * 10) / 10,
    consistency: Math.round(scoreConsistency(endpoints) * 10) / 10,
    versioning: Math.round(scoreVersioning(paths) * 10) / 10,
    errorHandling: Math.round(scoreErrorHandling(endpoints) * 10) / 10,
    documentation: Math.round(scoreDocumentation(endpoints) * 10) / 10,
  };

  const totalRaw =
    breakdown.naming +
    breakdown.http +
    breakdown.structure +
    breakdown.consistency +
    breakdown.versioning +
    breakdown.errorHandling +
    breakdown.documentation;

  const totalScore = Math.min(100, Math.round(totalRaw * 10) / 10);

  const suggestions = buildSuggestions(issues);

  return {
    totalScore,
    breakdown,
    issues,
    suggestions,
  };
}
