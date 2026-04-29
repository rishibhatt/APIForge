/**
 * Deterministic REST-style path transformations (preview only; no I/O).
 */

export type Endpoint = {
  path: string;
  method: string;
};

export type FixChange = {
  from: string;
  to: string;
  type: "removed" | "added" | "modified";
};

export type FixItem = {
  /** Original path only (leading slash normalized for display baseline). */
  original: string;
  /** Suggested improved path. */
  fixed: string;
  /** HTTP method (uppercase) for display and export. */
  method: string;
  changes: FixChange[];
  confidence: number;
  impact: "low" | "medium" | "high";
  reason: string;
};

const VERB_PREFIXES = [
  "fetch",
  "create",
  "update",
  "delete",
  "remove",
  "search",
  "list",
  "add",
  "edit",
  "save",
  "get",
] as const;

const SKIP_PLURAL = new Set(["api", "apis", "v1", "v2", "v3", "beta", "public", "internal"]);

function isVersionSegment(seg: string): boolean {
  return /^v\d+$/i.test(seg);
}

/** camelCase / PascalCase / snake_case segment → kebab-case */
export function segmentToKebab(seg: string): string {
  if (seg.includes("-") && !/[A-Z]/.test(seg)) {
    return seg
      .split("-")
      .map((p) => p.toLowerCase())
      .join("-");
  }
  const noSnake = seg.replace(/_/g, "-");
  const kebab = noSnake
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
  return kebab.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function normalizePath(path: string): { value: string; touched: boolean } {
  let p = path.trim();
  const before = p;
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return { value: p, touched: p !== before };
}

function stripLeadingVerbFromSegment(segment: string): {
  next: string;
  verb: string | null;
} {
  const lower = segment.toLowerCase();
  const sorted = [...VERB_PREFIXES].sort((a, b) => b.length - a.length);
  for (const v of sorted) {
    if (lower.startsWith(v) && segment.length > v.length) {
      const rest = segment.slice(v.length);
      if (/^[a-zA-Z]/.test(rest)) {
        return { next: rest.charAt(0).toLowerCase() + rest.slice(1), verb: v };
      }
    }
  }
  return { next: segment, verb: null };
}

function pluralizeToken(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 1) return word;
  if (w.endsWith("s")) return word;
  if (w.endsWith("y") && w.length > 2 && !"aeiou".includes(w[w.length - 2]!)) {
    return `${word.slice(0, -1)}ies`;
  }
  if (w.endsWith("ch") || w.endsWith("sh") || w.endsWith("x") || w === "o") {
    return `${word}es`;
  }
  return `${word}s`;
}

/** Pluralize last hyphen chunk of a segment (e.g. user-data → users-data). */
function pluralizeSegment(seg: string): string {
  const parts = seg.split("-").filter(Boolean);
  if (parts.length === 0) return seg;
  const last = parts[parts.length - 1]!;
  const pl = pluralizeToken(last);
  parts[parts.length - 1] = pl;
  return parts.join("-");
}

function shouldPluralizeSegment(seg: string, index: number): boolean {
  const lower = seg.toLowerCase();
  if (SKIP_PLURAL.has(lower) || isVersionSegment(seg)) return false;
  if (seg.includes("{")) return false;
  if (index === 0 && (lower === "api" || isVersionSegment(seg))) return false;
  return true;
}

function joinPath(segments: string[]): string {
  if (segments.length === 0) return "/";
  return `/${segments.join("/")}`;
}

function scoreAndImpact(
  hadVerb: boolean,
  hadPlural: boolean,
  hadKebab: boolean,
  hadNormalize: boolean,
  hadId: boolean,
): { confidence: number; impact: FixItem["impact"] } {
  let weight = 0;
  if (hadNormalize) weight += 1;
  if (hadKebab) weight += 2;
  if (hadVerb) weight += 3;
  if (hadPlural) weight += 2;
  if (hadId) weight += 2;

  let confidence = 0.5;
  if (weight >= 6) confidence = 0.9;
  else if (weight >= 3) confidence = 0.7;

  let impact: FixItem["impact"] = "low";
  if (hadVerb || hadPlural || hadId) impact = "high";
  else if (hadKebab || weight >= 3) impact = "medium";

  return { confidence, impact };
}

function buildReason(flags: {
  verb: boolean;
  kebab: boolean;
  plural: boolean;
  id: boolean;
  normalize: boolean;
}): string {
  const parts: string[] = [];
  if (flags.normalize) parts.push("normalized path");
  if (flags.verb) parts.push("removed verb-style segment prefix");
  if (flags.kebab) parts.push("normalized segment casing to kebab-case");
  if (flags.plural) parts.push("used plural resource naming");
  if (flags.id) parts.push("added explicit `{id}` for GET collection item access");
  if (parts.length === 0) return "No structural changes required.";
  return `${parts[0]!.charAt(0).toUpperCase()}${parts[0]!.slice(1)}${parts.length > 1 ? `; ${parts.slice(1).join("; ")}` : ""}.`;
}

/**
 * Transform a single endpoint through the fix pipeline.
 */
export function transformEndpoint(endpoint: Endpoint): FixItem {
  const method = endpoint.method.trim().toUpperCase() || "GET";
  const changes: FixChange[] = [];

  const norm = normalizePath(endpoint.path);
  const path = norm.value;
  if (norm.touched) {
    changes.push({
      from: endpoint.path.trim(),
      to: path,
      type: "modified",
    });
  }

  const segments = path.split("/").filter(Boolean);
  let hadVerb = false;
  let hadKebab = false;
  let hadPlural = false;
  let hadId = false;

  if (segments.length > 0) {
    const first = segments[0]!;
    const { next, verb } = stripLeadingVerbFromSegment(first);
    if (verb) {
      changes.push({ from: first, to: next, type: "modified" });
      segments[0] = next;
      hadVerb = true;
    }
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (seg.includes("{")) continue;
    const kebab = segmentToKebab(seg);
    if (kebab !== seg) {
      changes.push({ from: seg, to: kebab, type: "modified" });
      segments[i] = kebab;
      hadKebab = true;
    }
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (!shouldPluralizeSegment(seg, i)) continue;
    if (seg.includes("{")) continue;
    const pl = pluralizeSegment(seg);
    if (pl !== seg) {
      changes.push({ from: seg, to: pl, type: "modified" });
      segments[i] = pl;
      hadPlural = true;
    }
  }

  let fixedPath = joinPath(segments);

  if (
    method === "GET" &&
    !fixedPath.includes("{") &&
    segments.length === 1
  ) {
    const withId = `${fixedPath}/{id}`;
    changes.push({
      from: fixedPath,
      to: withId,
      type: "added",
    });
    fixedPath = withId;
    hadId = true;
  }

  const { confidence, impact } = scoreAndImpact(
    hadVerb,
    hadPlural,
    hadKebab,
    norm.touched,
    hadId,
  );

  const reason = buildReason({
    verb: hadVerb,
    kebab: hadKebab,
    plural: hadPlural,
    id: hadId,
    normalize: norm.touched,
  });

  return {
    original: norm.value,
    fixed: fixedPath,
    method,
    changes,
    confidence,
    impact,
    reason,
  };
}

/**
 * Generate suggested fixes for all endpoints (synchronous).
 */
export function generateFixes(endpoints: Endpoint[]): FixItem[] {
  if (endpoints.length === 0) return [];
  return endpoints.map((ep) => transformEndpoint(ep));
}
