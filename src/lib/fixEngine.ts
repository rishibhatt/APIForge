/**
 * Deterministic REST-style path + method suggestions (preview only; no I/O).
 * Combines semantic REST repair (Google AIP-style, Microsoft REST, OpenAPI habits)
 * with legacy normalization (kebab-case, safe pluralization, RPC suffix cleanup).
 */

export type Endpoint = {
  path: string;
  method: string;
};

export type FixChangeCategory =
  | "casing"
  | "pluralization"
  | "method"
  | "structure"
  | "rest-compliance";

export type FixChange = {
  from: string;
  to: string;
  type: "removed" | "added" | "modified";
  category: FixChangeCategory;
};

export type RestAction = "create" | "read" | "update" | "delete" | "list" | "unknown";

export type FixItem = {
  /** Normalized original path (leading slash, no trailing slash). */
  original: string;
  fixed: string;
  /** Suggested HTTP method (uppercase). */
  method: string;
  /** Method from the source specification. */
  originalMethod: string;
  methodChanged: boolean;
  restCompliant: boolean;
  scoreBefore: number;
  scoreAfter: number;
  improvements: string[];
  changes: FixChange[];
  /** 0–1 convenience mapping from scoreAfter. */
  confidence: number;
  impact: "low" | "medium" | "high";
  reason: string;
};

export type RestComplianceAnalysis = {
  action: RestAction;
  mismatch: boolean;
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

const SKIP_PLURAL = new Set([
  "api",
  "apis",
  "v1",
  "v2",
  "v3",
  "beta",
  "public",
  "internal",
]);

const RESOURCE_PREFIX_SKIPS = new Set([
  "api",
  "apis",
  "internal",
  "public",
  "beta",
]);

/** Never treat as a pluralizable resource noun (common path noise, mass nouns, verbs-as-segments). */
const NEVER_PLURALIZE = new Set([
  "all",
  "any",
  "none",
  "self",
  "me",
  "new",
  "old",
  "default",
  "current",
  "recent",
  "latest",
  "first",
  "last",
  "next",
  "prev",
  "batch",
  "bulk",
  "search",
  "count",
  "export",
  "import",
  "sync",
  "validate",
  "submit",
  "cancel",
  "clone",
  "copy",
  "reset",
  "init",
  "start",
  "stop",
  "run",
  "execute",
  "invoke",
  "process",
  "parse",
  "upload",
  "download",
  "delete",
  "remove",
  "create",
  "update",
  "add",
  "get",
  "post",
  "put",
  "patch",
  "head",
  "options",
  "trace",
  "connect",
  "list",
  "fetch",
  "find",
  "read",
  "write",
  "save",
  "load",
  "auth",
  "login",
  "logout",
  "signin",
  "signout",
  "callback",
  "webhook",
  "hook",
  "health",
  "status",
  "metrics",
  "ping",
  "version",
  "info",
  "metadata",
  "schema",
  "docs",
  "graphql",
  "rest",
  "openapi",
  "swagger",
  "data",
  "index",
  "root",
  "admin",
  "debug",
  "test",
  "mock",
  "staging",
  "prod",
  "production",
]);

const DATA_SUFFIX_CHUNKS = new Set([
  "data",
  "info",
  "details",
  "meta",
  "summary",
  "payload",
]);

function isVersionSegment(seg: string): boolean {
  return /^v\d+$/i.test(seg);
}

function ch(
  from: string,
  to: string,
  type: FixChange["type"],
  category: FixChangeCategory,
): FixChange {
  return { from, to, type, category };
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
  if (NEVER_PLURALIZE.has(w)) return word;
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
  const lastLower = last.toLowerCase();
  if (NEVER_PLURALIZE.has(lastLower)) return seg;
  const pl = pluralizeToken(last);
  if (pl === last) return seg;
  parts[parts.length - 1] = pl;
  return parts.join("-");
}

function shouldPluralizeSegment(
  seg: string,
  index: number,
  total: number,
): boolean {
  const lower = seg.toLowerCase();
  if (SKIP_PLURAL.has(lower) || isVersionSegment(seg)) return false;
  if (NEVER_PLURALIZE.has(lower)) return false;
  if (seg.includes("{")) return false;
  if (index === 0 && (lower === "api" || isVersionSegment(seg))) return false;
  if (index === total - 1 && isRpcVerbSegment(lower)) return false;
  if (lower.length <= 2) return false;
  return true;
}

/** Single-token RPC verbs in URL segments (custom methods as path suffix). */
function isRpcVerbSegment(lower: string): boolean {
  return /^(delete|remove|get|list|fetch|read|create|add|post|update|put|replace|patch|search|count|export|import|sync|validate|submit|cancel|execute|invoke|run|process|parse|upload|download|save|load|find|write)$/i.test(
    lower,
  );
}

function joinPath(segments: string[]): string {
  if (segments.length === 0) return "/";
  return `/${segments.join("/")}`;
}

function pathActionFromWholeSegment(rawSegments: string[]): RestAction | null {
  const lower = rawSegments.map((s) => s.toLowerCase().replace(/[{}]/g, ""));
  for (let i = rawSegments.length - 1; i >= 0; i--) {
    const key = lower[i]!;
    if (key === "delete" || key === "remove") return "delete";
    if (key === "create" || key === "add") return "create";
    if (key === "update") return "update";
    if (key === "list") return "list";
    if (key === "get" || key === "fetch") return "read";
  }
  return null;
}

function pathActionFromVerbPrefix(rawSegments: string[]): RestAction | null {
  if (rawSegments.length !== 1) return null;
  const { verb } = stripLeadingVerbFromSegment(rawSegments[0]!);
  if (!verb) return null;
  if (verb === "delete" || verb === "remove") return "delete";
  if (verb === "create" || verb === "add") return "create";
  if (verb === "update" || verb === "edit") return "update";
  if (verb === "list") return "list";
  if (verb === "get" || verb === "fetch") return "read";
  return null;
}

function methodDefaultAction(method: string): RestAction {
  switch (method) {
    case "POST":
      return "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    case "GET":
      return "list";
    default:
      return "unknown";
  }
}

function methodMatchesAction(
  method: string,
  action: RestAction,
): boolean {
  if (action === "unknown") return true;
  const m = method.toUpperCase();
  if (action === "create") return m === "POST";
  if (action === "delete") return m === "DELETE";
  if (action === "update") return m === "PUT" || m === "PATCH";
  if (action === "read" || action === "list") return m === "GET";
  return true;
}

function refineGetAction(
  rawSegments: string[],
  segmentsLower: string[],
): RestAction {
  if (segmentsLower.includes("list")) return "list";
  if (rawSegments.length === 1) {
    const v = stripLeadingVerbFromSegment(rawSegments[0]!).verb;
    if (v === "list") return "list";
    if (v === "get" || v === "fetch") return "read";
    return "list";
  }
  return "list";
}

/**
 * Infer REST-style action from HTTP verb + URL segments.
 * Path RPC verbs (e.g. …/Delete) override the method when they disagree (documented inconsistency).
 */
export function detectAction(intent: {
  path: string;
  method: string;
}): {
  action: RestAction;
  confidence: number;
  mismatch: boolean;
} {
  const method = (intent.method || "GET").trim().toUpperCase();
  const norm = normalizePath(intent.path);
  const rawSegments = norm.value.split("/").filter(Boolean);
  const segmentsLower = rawSegments.map((s) => s.toLowerCase());

  const pathWhole = pathActionFromWholeSegment(rawSegments);
  const pathPrefix = pathActionFromVerbPrefix(rawSegments);
  const pathAction = pathWhole ?? pathPrefix;

  let methodAction = methodDefaultAction(method);
  if (method === "GET" && !pathAction) {
    methodAction = refineGetAction(rawSegments, segmentsLower);
  }

  let action: RestAction;
  let mismatch = false;
  let confidence: number;

  if (pathAction) {
    action = pathAction;
    mismatch = !methodMatchesAction(method, pathAction);
    confidence = mismatch ? 0.93 : 0.88;
  } else {
    action = methodAction;
    mismatch = false;
    confidence = 0.78;
  }

  return { action, confidence, mismatch };
}

/** Preferred HTTP verb for a logical REST action. */
export function getCorrectHttpMethod(
  action: RestAction,
): "GET" | "POST" | "PUT" | "PATCH" | "DELETE" {
  switch (action) {
    case "create":
      return "POST";
    case "read":
    case "list":
      return "GET";
    case "update":
      return "PATCH";
    case "delete":
      return "DELETE";
    default:
      return "GET";
  }
}

/**
 * Strip infrastructure prefixes and RPC verb segments; infer plural kebab resource path tail.
 */
export function extractResource(pathSegments: string[]): {
  resource: string;
  isCollection: boolean;
} {
  const working = pathSegments.filter(
    (s) =>
      !RESOURCE_PREFIX_SKIPS.has(s.toLowerCase()) && !isVersionSegment(s),
  );

  const stripTrailingRpc = (segs: string[]): string[] => {
    const out = [...segs];
    while (
      out.length > 0 &&
      isRpcVerbSegment(out[out.length - 1]!.toLowerCase())
    ) {
      out.pop();
    }
    return out;
  };

  const segs = stripTrailingRpc(working);
  if (segs.length === 0) {
    return { resource: "items", isCollection: true };
  }

  const scope = segs.slice(0, -1).map((s) => segmentToKebab(s));
  const lastRaw = segs[segs.length - 1]!;
  const { next } = stripLeadingVerbFromSegment(lastRaw);
  let base = segmentToKebab(next);

  const parts = base.split("-").filter(Boolean);
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1]!;
    if (DATA_SUFFIX_CHUNKS.has(tail)) {
      base = parts.slice(0, -1).join("-");
    }
  }

  const pluralLast = pluralizeSegment(base);
  const resource = [...scope, pluralLast].filter(Boolean).join("/");
  return { resource, isCollection: true };
}

function hasVerbStyleSegment(rawSegments: string[]): boolean {
  return rawSegments.some((r) => stripLeadingVerbFromSegment(r).verb !== null);
}

function shouldApplySemanticRest(
  endpoint: Endpoint,
  normPath: string,
  detection: ReturnType<typeof detectAction>,
): boolean {
  const method = (endpoint.method || "GET").trim().toUpperCase();
  const raw = normPath.split("/").filter(Boolean);
  if (pathActionFromWholeSegment(raw)) return true;
  if (pathActionFromVerbPrefix(raw)) return true;
  if (hasVerbStyleSegment(raw)) return true;
  if (detection.mismatch) return true;
  const correct = getCorrectHttpMethod(detection.action);
  if (detection.action !== "unknown" && correct !== method) return true;
  return false;
}

/**
 * Semantic REST repair: resource-oriented path + aligned HTTP method.
 */
export function transformToRest(endpoint: Endpoint): {
  method: string;
  fixed: string;
  changes: FixChange[];
  improvements: string[];
} {
  const norm = normalizePath(endpoint.path);
  const normPath = norm.value;
  const rawSegs = normPath.split("/").filter(Boolean);
  const origMethod = (endpoint.method || "GET").trim().toUpperCase();
  const detection = detectAction({ path: normPath, method: origMethod });
  const action = detection.action;

  const prefix = rawSegs.filter(
    (s) =>
      RESOURCE_PREFIX_SKIPS.has(s.toLowerCase()) || isVersionSegment(s),
  );

  const { resource } = extractResource(rawSegs);
  let method = getCorrectHttpMethod(action);
  if (origMethod === "PUT" && action === "update") method = "PATCH";

  const needsId = action === "delete" || action === "read" || action === "update";
  const tailParts = needsId ? ["{id}"] : [];

  const fixed = joinPath([
    ...prefix.map((s) => segmentToKebab(s)),
    ...resource.split("/").map((s) => segmentToKebab(s)),
    ...tailParts,
  ]);

  const changes: FixChange[] = [];
  const improvements: string[] = [];

  if (norm.touched) {
    changes.push(
      ch(endpoint.path.trim(), normPath, "modified", "structure"),
    );
  }

  if (method !== origMethod) {
    changes.push(ch(origMethod, method, "modified", "method"));
    improvements.push("Aligned HTTP method with the intended operation.");
  }

  if (normPath !== fixed) {
    changes.push(ch(normPath, fixed, "modified", "rest-compliance"));
    improvements.push(
      "Replaced action-based URL segments with resource-oriented REST design.",
    );
  }

  if (needsId && !normPath.includes("{")) {
    improvements.push(
      "Introduced resource identifier `{id}` for proper entity targeting.",
    );
  }

  if (detection.mismatch) {
    improvements.push(
      "Resolved inconsistency between HTTP method and URL action semantics.",
    );
  }

  const uniq = Array.from(new Set(improvements));
  return { method, fixed, changes, improvements: uniq };
}

function stripTrailingRpcVerb(
  method: string,
  segments: string[],
  changes: FixChange[],
): string[] {
  if (segments.length < 2) return segments;
  const m = method.toUpperCase();
  const last = segments[segments.length - 1]!.toLowerCase();
  const map: Partial<Record<string, readonly string[]>> = {
    DELETE: ["delete", "remove"],
    POST: ["create", "add"],
    PUT: ["update", "put", "replace"],
    PATCH: ["update", "patch"],
  };
  const verbs = map[m];
  if (!verbs || !verbs.includes(last)) return segments;

  const beforePath = joinPath(segments);
  const next = segments.slice(0, -1);
  const afterPath = joinPath(next);
  changes.push(
    ch(beforePath, afterPath, "modified", "rest-compliance"),
  );
  return next;
}

function legacyImpact(
  hadVerb: boolean,
  hadPlural: boolean,
  hadKebab: boolean,
  hadNormalize: boolean,
  hadId: boolean,
  hadRpcStrip: boolean,
): FixItem["impact"] {
  if (hadVerb || hadPlural || hadId || hadRpcStrip) return "high";
  if (hadKebab || hadNormalize) return "medium";
  return "low";
}

function buildLegacyReason(flags: {
  verb: boolean;
  kebab: boolean;
  plural: boolean;
  id: boolean;
  normalize: boolean;
  rpcStrip: boolean;
}): string {
  const parts: string[] = [];
  if (flags.normalize) parts.push("normalized path shape");
  if (flags.verb) parts.push("removed verb-style segment prefix");
  if (flags.kebab) parts.push("normalized segment casing to kebab-case");
  if (flags.plural)
    parts.push("used plural resource naming where appropriate");
  if (flags.rpcStrip) {
    parts.push(
      "removed trailing path segment that duplicated the HTTP method (verb belongs on the request, not the URL)",
    );
  }
  if (flags.id)
    parts.push("added explicit `{id}` for collection item access");
  if (parts.length === 0) return "No structural changes required.";
  return `${parts[0]!.charAt(0).toUpperCase()}${parts[0]!.slice(1)}${parts.length > 1 ? `; ${parts.slice(1).join("; ")}` : ""}.`;
}

function pathHasRpcVerbSegment(path: string): boolean {
  const raw = normalizePath(path).value.split("/").filter(Boolean);
  return raw.some((s) => isRpcVerbSegment(s.toLowerCase()));
}

function hasTemplateId(path: string): boolean {
  return /\{[^}]+\}/.test(path);
}

/**
 * Weighted REST compliance score (0–100) for a concrete method + path.
 * `scoreBefore` uses {@link detectAction} on `input`; `scoreAfter` on `output`.
 */
export function scoreRestCompliance(
  input: { method: string; path: string },
  output: { method: string; path: string },
): { scoreBefore: number; scoreAfter: number } {
  const inputDet = detectAction({ path: input.path, method: input.method });
  return {
    scoreBefore: evaluateRestScore(input, inputDet),
    scoreAfter: evaluateRestScore(
      output,
      detectAction({ path: output.path, method: output.method }),
    ),
  };
}

function evaluateRestScore(
  ep: { method: string; path: string },
  det: RestComplianceAnalysis,
): number {
  const method = ep.method.trim().toUpperCase();
  const norm = normalizePath(ep.path);
  const raw = norm.value.split("/").filter(Boolean);
  const segs = raw.map((s) => segmentToKebab(s));

  let score = 0;
  const expected = getCorrectHttpMethod(det.action);
  if (method === expected) score += 25;
  else if (
    det.action === "update" &&
    (method === "PUT" || method === "PATCH")
  )
    score += 20;
  else if (
    (det.action === "read" || det.action === "list") &&
    method === "GET"
  )
    score += 25;
  else if (det.action === "unknown") score += 15;
  else score += 4;

  const resourceSegs = raw.filter(
    (s) =>
      !RESOURCE_PREFIX_SKIPS.has(s.toLowerCase()) &&
      !isVersionSegment(s) &&
      !isRpcVerbSegment(s.toLowerCase()) &&
      !s.includes("{"),
  );
  const lastRes = resourceSegs[resourceSegs.length - 1];
  if (lastRes) {
    const kebab = segmentToKebab(
      stripLeadingVerbFromSegment(lastRes).next,
    );
    const pl = pluralizeSegment(kebab);
    if (pl !== kebab) score += 7;
    else score += 15;
  } else score += 6;

  if (!pathHasRpcVerbSegment(ep.path)) score += 15;
  else score += 2;

  if (segs.length >= 2 || (segs.length === 1 && segs[0] !== "api"))
    score += 10;
  else score += 4;

  const needsId =
    det.action === "delete" ||
    det.action === "read" ||
    det.action === "update";
  if (needsId) {
    if (hasTemplateId(ep.path)) score += 15;
    else score += 2;
  } else score += 15;

  if (!det.mismatch) score += 10;
  else score += 2;

  if (!/[A-Z_]/.test(ep.path) && raw.every((s) => s === segmentToKebab(s)))
    score += 10;
  else if (!/[A-Z]/.test(ep.path)) score += 7;
  else score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildHumanReason(params: {
  semantic: boolean;
  methodChanged: boolean;
  rpcStrip: boolean;
  legacyReason: string;
  improvements: string[];
}): string {
  const head: string[] = [];
  if (params.semantic) {
    head.push(
      "Applied resource-oriented REST shaping (methods on HTTP, nouns in paths).",
    );
  }
  if (params.methodChanged) {
    head.push("Aligned HTTP method with the intended CRUD semantics.");
  }
  if (params.rpcStrip) {
    head.push(
      "Removed redundant action segment that duplicated the HTTP method.",
    );
  }
  const tail =
    params.legacyReason === "No structural changes required."
      ? ""
      : ` ${params.legacyReason}`;
  const extra =
    params.improvements.length > 0
      ? ` ${params.improvements.join(" ")}`
      : "";
  const base = [...head, tail.trim(), extra.trim()].filter(Boolean).join(" ");
  return base.length > 0 ? base : "No structural changes required.";
}

function applyLegacyTransform(
  endpoint: Endpoint,
  normPath: string,
  initialChanges: FixChange[],
): {
  changes: FixChange[];
  fixedPath: string;
  method: string;
  hadVerb: boolean;
  hadKebab: boolean;
  hadPlural: boolean;
  hadId: boolean;
  hadRpcStrip: boolean;
  hadNormalize: boolean;
} {
  const method = (endpoint.method || "GET").trim().toUpperCase();
  const changes = [...initialChanges];
  const norm = normalizePath(endpoint.path);
  const hadNormalize = norm.touched;

  const segments = normPath.split("/").filter(Boolean);
  let hadVerb = false;
  let hadKebab = false;
  let hadPlural = false;
  let hadId = false;
  let hadRpcStrip = false;

  if (segments.length > 0) {
    const first = segments[0]!;
    const { next, verb } = stripLeadingVerbFromSegment(first);
    if (verb) {
      changes.push(ch(first, next, "modified", "rest-compliance"));
      segments[0] = next;
      hadVerb = true;
    }
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (seg.includes("{")) continue;
    const kebab = segmentToKebab(seg);
    if (kebab !== seg) {
      changes.push(ch(seg, kebab, "modified", "casing"));
      segments[i] = kebab;
      hadKebab = true;
    }
  }

  const total = segments.length;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (!shouldPluralizeSegment(seg, i, total)) continue;
    if (seg.includes("{")) continue;
    const pl = pluralizeSegment(seg);
    if (pl !== seg) {
      changes.push(ch(seg, pl, "modified", "pluralization"));
      segments[i] = pl;
      hadPlural = true;
    }
  }

  const afterRpc = stripTrailingRpcVerb(method, segments, changes);
  if (afterRpc.length !== segments.length) {
    segments.length = 0;
    segments.push(...afterRpc);
    hadRpcStrip = true;
  }

  let fixedPath = joinPath(segments);

  if (
    method === "GET" &&
    !fixedPath.includes("{") &&
    segments.length === 1
  ) {
    const withId = `${fixedPath}/{id}`;
    changes.push(ch(fixedPath, withId, "added", "structure"));
    fixedPath = withId;
    hadId = true;
  }

  return {
    changes,
    fixedPath,
    method,
    hadVerb,
    hadKebab,
    hadPlural,
    hadId,
    hadRpcStrip,
    hadNormalize,
  };
}

/**
 * Full pipeline: semantic REST repair when warranted, otherwise legacy normalization.
 */
export function transformEndpoint(endpoint: Endpoint): FixItem {
  const originalMethod = (endpoint.method || "GET").trim().toUpperCase();
  const norm = normalizePath(endpoint.path);
  const normPath = norm.value;

  const detection = detectAction({ path: normPath, method: originalMethod });
  const useSemantic = shouldApplySemanticRest(endpoint, normPath, detection);

  let methodOut = originalMethod;
  let fixedPath = normPath;
  let changes: FixChange[] = [];
  let improvements: string[] = [];
  let hadRpcStrip = false;
  let semantic = false;

  const initialChanges: FixChange[] = [];
  if (norm.touched) {
    initialChanges.push(
      ch(endpoint.path.trim(), normPath, "modified", "structure"),
    );
  }

  if (useSemantic) {
    semantic = true;
    const rest = transformToRest(endpoint);
    methodOut = rest.method;
    fixedPath = rest.fixed;
    changes = rest.changes;
    improvements = rest.improvements;

    const polishSegs = fixedPath.split("/").filter(Boolean);
    const afterRpc = stripTrailingRpcVerb(methodOut, polishSegs, changes);
    if (afterRpc.length !== polishSegs.length) {
      fixedPath = joinPath(afterRpc);
      hadRpcStrip = true;
    }
  } else {
    const leg = applyLegacyTransform(endpoint, normPath, initialChanges);
    changes = leg.changes;
    fixedPath = leg.fixedPath;
    methodOut = leg.method;
    hadRpcStrip = leg.hadRpcStrip;
    const legacyReason = buildLegacyReason({
      verb: leg.hadVerb,
      kebab: leg.hadKebab,
      plural: leg.hadPlural,
      id: leg.hadId,
      normalize: leg.hadNormalize,
      rpcStrip: leg.hadRpcStrip,
    });

    const { scoreBefore, scoreAfter } = scoreRestCompliance(
      { method: originalMethod, path: normPath },
      { method: methodOut, path: fixedPath },
    );

    const restCompliant = scoreAfter >= 85;
    const methodChanged = methodOut !== originalMethod;
    const confidence = Math.min(1, Math.max(0, scoreAfter / 100));
    const impact =
      scoreAfter - scoreBefore >= 25 || leg.hadVerb || leg.hadRpcStrip
        ? "high"
        : legacyImpact(
            leg.hadVerb,
            leg.hadPlural,
            leg.hadKebab,
            leg.hadNormalize,
            leg.hadId,
            leg.hadRpcStrip,
          );

    const reason = buildHumanReason({
      semantic: false,
      methodChanged,
      rpcStrip: leg.hadRpcStrip,
      legacyReason,
      improvements: [],
    });

    return {
      original: normPath,
      fixed: fixedPath,
      method: methodOut,
      originalMethod,
      methodChanged,
      restCompliant,
      scoreBefore,
      scoreAfter,
      improvements: [],
      changes,
      confidence,
      impact,
      reason,
    };
  }

  const { scoreBefore, scoreAfter } = scoreRestCompliance(
    { method: originalMethod, path: normPath },
    { method: methodOut, path: fixedPath },
  );

  const restCompliant = scoreAfter >= 85;
  const methodChanged = methodOut !== originalMethod;
  const confidence = Math.min(1, Math.max(0, scoreAfter / 100));
  const impact: FixItem["impact"] =
    methodChanged || semantic || hadRpcStrip || detection.mismatch
      ? "high"
      : scoreAfter - scoreBefore >= 20
        ? "medium"
        : "low";

  const legacyReason = buildLegacyReason({
    verb: false,
    kebab: false,
    plural: false,
    id: false,
    normalize: norm.touched,
    rpcStrip: hadRpcStrip,
  });

  const reason = buildHumanReason({
    semantic,
    methodChanged,
    rpcStrip: hadRpcStrip,
    legacyReason,
    improvements,
  });

  return {
    original: normPath,
    fixed: fixedPath,
    method: methodOut,
    originalMethod,
    methodChanged,
    restCompliant,
    scoreBefore,
    scoreAfter,
    improvements,
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

/** @internal Asserted by maintainers — deterministic checks for documented examples. */
export function assertRestExamples(): void {
  const cases: { ep: Endpoint; expectPath: string; expectMethod: string }[] = [
    {
      ep: { method: "POST", path: "/api/Booking/Delete" },
      expectPath: "/api/bookings/{id}",
      expectMethod: "DELETE",
    },
    {
      ep: { method: "GET", path: "/getUserData" },
      expectPath: "/users/{id}",
      expectMethod: "GET",
    },
    {
      ep: { method: "POST", path: "/createOrder" },
      expectPath: "/orders",
      expectMethod: "POST",
    },
    {
      ep: { method: "PUT", path: "/updateProfile" },
      expectPath: "/profiles/{id}",
      expectMethod: "PATCH",
    },
  ];
  for (const c of cases) {
    const r = transformEndpoint(c.ep);
    if (r.fixed !== c.expectPath || r.method !== c.expectMethod) {
      throw new Error(
        `REST example failed: ${c.ep.method} ${c.ep.path} → got ${r.method} ${r.fixed}, expected ${c.expectMethod} ${c.expectPath}`,
      );
    }
  }
}
