import type { NormalizedEndpoint } from "./types";
import type { ApiIssue } from "./types";

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

function segments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function hasCamelCaseInPath(path: string): boolean {
  return /\/[a-z][A-Z]|_[a-z]/.test(path) || /[a-z][A-Z]/.test(path);
}

function hasUnderscoreSegment(path: string): boolean {
  return segments(path).some((s) => !s.startsWith("{") && s.includes("_"));
}

function verbLikeSegment(path: string): string | null {
  for (const seg of segments(path)) {
    if (seg.startsWith("{")) continue;
    const lower = seg.toLowerCase();
    if (VERB_SEGMENTS.has(lower)) return seg;
  }
  return null;
}

function pathDepth(path: string): number {
  return segments(path).length;
}

function hasVersionPrefix(paths: string[]): boolean {
  return paths.some((p) => {
    const segs = segments(p);
    return segs.some((s) => /^v\d+$/i.test(s));
  });
}

function hasJsonBody(ep: NormalizedEndpoint): boolean {
  const b = ep.requestBody;
  if (!b || typeof b !== "object") return false;
  const content = (b as { content?: unknown }).content;
  return !!content && typeof content === "object";
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

function hasSuccessDeclared(ep: NormalizedEndpoint): boolean {
  const r = ep.responses;
  if (!r || typeof r !== "object") return false;
  for (const code of Object.keys(r)) {
    const n = Number(code);
    if (Number.isFinite(n) && n >= 200 && n < 300) return true;
  }
  return false;
}

function resourceTokens(paths: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of paths) {
    for (const seg of segments(p)) {
      if (seg.startsWith("{")) continue;
      if (/^v\d+$/i.test(seg)) continue;
      if (seg === "api" || seg === "apis") continue;
      const key = seg.toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

/**
 * Deterministic issue list from normalized endpoints (OpenAPI-aware when responses/body present).
 */
export function detectApiIssues(endpoints: NormalizedEndpoint[]): ApiIssue[] {
  const issues: ApiIssue[] = [];
  if (endpoints.length === 0) {
    issues.push({
      type: "documentation",
      severity: "high",
      message: "No operations found to evaluate.",
      example_fix: "Provide an OpenAPI document or a list of METHOD /path lines.",
    });
    return issues;
  }

  const paths = endpoints.map((e) => e.path);

  for (const ep of endpoints) {
    const ctx = `${ep.method} ${ep.path}`;

    if (hasCamelCaseInPath(ep.path)) {
      issues.push({
        type: "naming",
        severity: "medium",
        message: `${ctx}: URLs should use kebab-case, not camelCase.`,
        example_fix: "Rename segments to kebab-case (e.g. /user-profile → /user-profile already ok; avoid /userProfile).",
      });
    }

    if (hasUnderscoreSegment(ep.path)) {
      issues.push({
        type: "naming",
        severity: "low",
        message: `${ctx}: Prefer hyphens over underscores in path segments (Google/AIP style).`,
        example_fix: "/user_profile → /user-profile",
      });
    }

    const verbSeg = verbLikeSegment(ep.path);
    if (verbSeg) {
      issues.push({
        type: "naming",
        severity: "high",
        message: `${ctx}: Path contains a verb-like segment "${verbSeg}"; resources should be nouns.`,
        example_fix: "Use nouns and HTTP methods for actions (e.g. DELETE /users/{id} instead of /deleteUser).",
      });
    }

    if (ep.method === "GET" && hasJsonBody(ep)) {
      issues.push({
        type: "http",
        severity: "high",
        message: `${ctx}: GET requests should not carry a request body (REST semantics).`,
        example_fix: "Use POST for complex queries or move filters to query parameters.",
      });
    }

    if (pathDepth(ep.path) > 4) {
      issues.push({
        type: "structure",
        severity: "medium",
        message: `${ctx}: Path is deeply nested (${pathDepth(ep.path)} segments); prefer flatter resources where possible.`,
        example_fix: "Consider /user-groups/{id}/members instead of chains deeper than ~3 resource levels.",
      });
    }

    if (ep.responses !== undefined && !hasSuccessDeclared(ep)) {
      issues.push({
        type: "errorHandling",
        severity: "medium",
        message: `${ctx}: No successful (2xx) response is documented.`,
        example_fix: "Document 200 or 201 with a schema in OpenAPI.",
      });
    }

    if (ep.responses !== undefined && !hasErrorRangeDeclared(ep)) {
      issues.push({
        type: "errorHandling",
        severity: "medium",
        message: `${ctx}: No error responses (4xx/5xx) are documented.`,
        example_fix: "Add 400, 404, and 500 (or default) with problem+json or your standard error schema.",
      });
    }

    if (!ep.description.trim()) {
      issues.push({
        type: "documentation",
        severity: "low",
        message: `${ctx}: Operation has no summary or description.`,
        example_fix: "Add `summary` and/or `description` on each operation in OpenAPI.",
      });
    }
  }

  if (!hasVersionPrefix(paths)) {
    issues.push({
      type: "versioning",
      severity: "medium",
      message: "No URL path versioning detected (e.g. /v1/...).",
      example_fix: "Expose major versions in the path or document version headers consistently.",
    });
  }

  const tokens = resourceTokens(paths);
  const singularPluralPairs: { a: string; b: string }[] = [];
  for (const key of Array.from(tokens.keys())) {
    if (key.length < 3) continue;
    if (key.endsWith("s") && key.length > 1) {
      const singular = key.slice(0, -1);
      if (tokens.has(singular) && singular.length > 1) {
        singularPluralPairs.push({ a: singular, b: key });
      }
    }
  }
  for (const { a, b } of singularPluralPairs) {
    const hasA = paths.some((p) =>
      segments(p).some((s) => s.toLowerCase() === a),
    );
    const hasB = paths.some((p) =>
      segments(p).some((s) => s.toLowerCase() === b),
    );
    if (hasA && hasB) {
      issues.push({
        type: "consistency",
        severity: "medium",
        message: `Mixed singular "${a}" and plural "${b}" style segments appear across paths.`,
        example_fix: `Standardize on one convention (usually plural nouns): /${b} consistently.`,
      });
      break;
    }
  }

  const dupKey = new Map<string, number>();
  for (const ep of endpoints) {
    const k = `${ep.method}\t${ep.path}`;
    dupKey.set(k, (dupKey.get(k) ?? 0) + 1);
  }
  for (const [k, n] of Array.from(dupKey.entries())) {
    if (n > 1) {
      const [method, path] = k.split("\t");
      issues.push({
        type: "consistency",
        severity: "high",
        message: `Duplicate operation ${method} ${path} appears ${n} times.`,
        example_fix: "Remove duplicate path+method entries from the specification.",
      });
    }
  }

  const methodMismatch =
    /\/(create|update|delete|remove)\b/i;
  for (const ep of endpoints) {
    if (methodMismatch.test(ep.path)) {
      issues.push({
        type: "http",
        severity: "medium",
        message: `${ep.method} ${ep.path}: Action verbs in the path often conflict with HTTP method semantics.`,
        example_fix: "POST /users instead of POST /users/create",
      });
    }
  }

  return dedupeIssues(issues);
}

function dedupeIssues(issues: ApiIssue[]): ApiIssue[] {
  const seen = new Set<string>();
  const out: ApiIssue[] = [];
  for (const i of issues) {
    const key = `${i.type}:${i.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}
