import type { TestCase } from "@/types/api";

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, "");
}

/** True if the quote at `at` is escaped by an odd number of consecutive backslashes. */
function isEscapedQuote(s: string, at: number): boolean {
  let n = 0;
  for (let j = at - 1; j >= 0 && s[j] === "\\"; j--) n++;
  return n % 2 === 1;
}

function stripOuterCodeFences(raw: string): string {
  let s = stripBom(raw).trim();
  for (let pass = 0; pass < 4; pass++) {
    const m = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```/im.exec(s);
    if (!m) break;
    s = m[1]!.trim();
  }
  return s;
}

/**
 * First top-level `[` … `]` span, respecting strings so `]` inside values does not truncate.
 */
function extractTopLevelJsonArray(s: string): string {
  const t = s.trim();
  const start = t.indexOf("[");
  if (start === -1) throw new Error("Model did not return a JSON array");
  let depth = 0;
  let inString = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i]!;
    if (inString) {
      if (c === '"' && !isEscapedQuote(t, i)) inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return t.slice(start, i + 1);
    }
  }
  throw new Error("Unclosed JSON array in model output");
}

function relaxTrailingCommas(json: string): string {
  let s = json;
  for (let pass = 0; pass < 12; pass++) {
    const next = s.replace(/,(\s*[}\]])/g, "$1");
    if (next === s) break;
    s = next;
  }
  return s;
}

function pickString(
  x: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = x[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Map common LLM variants to our canonical test kind. */
function normalizeType(t: unknown): TestCase["type"] | null {
  if (typeof t !== "string") return null;
  const s = t
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  if (
    [
      "valid",
      "positive",
      "success",
      "happy",
      "good",
      "ok",
      "pass",
      "passing",
      "valid_request",
      "happy_path",
      "happy_path_case",
    ].includes(s)
  ) {
    return "valid";
  }
  if (
    [
      "invalid",
      "negative",
      "bad",
      "error",
      "fail",
      "failing",
      "failure",
      "invalid_request",
      "err",
    ].includes(s)
  ) {
    return "invalid";
  }
  if (
    [
      "edge",
      "boundary",
      "security",
      "fuzz",
      "abuse",
      "rate_limit",
      "edge_case",
      "special",
    ].includes(s)
  ) {
    return "edge";
  }
  return null;
}

function coerceStatus(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = Math.trunc(v);
    if (n >= 100 && n < 600) return n;
    return n;
  }
  if (typeof v === "string") {
    const m = /\b(\d{3})\b/.exec(v);
    if (m) return parseInt(m[1]!, 10);
    const n = parseInt(v.replace(/\D/g, "").slice(0, 3), 10);
    if (!Number.isNaN(n) && n >= 100) return n;
  }
  return null;
}

function inferDefaultStatus(type: TestCase["type"]): number {
  if (type === "valid") return 200;
  if (type === "invalid") return 400;
  return 422;
}

function coerceTopLevelArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    for (const key of [
      "testCases",
      "tests",
      "cases",
      "items",
      "data",
      "scenarios",
      "results",
    ]) {
      const v = o[key];
      if (Array.isArray(v)) return v;
    }
  }
  return null;
}

function inferTypeFromStatus(status: number): TestCase["type"] {
  if (status >= 200 && status < 300) return "valid";
  if (status === 401 || status === 403 || status === 429 || status === 409) {
    return "edge";
  }
  if (status >= 400) return "invalid";
  return "edge";
}

function normalizeTestCase(o: unknown, index: number): TestCase | null {
  if (!o || typeof o !== "object") return null;
  const x = o as Record<string, unknown>;

  const statusEarly = coerceStatus(
    x.expectedStatus ??
      x.status ??
      x.expectedHttpStatus ??
      x.httpStatus ??
      x.expected_status,
  );

  let type = normalizeType(
    x.type ?? x.category ?? x.kind ?? x.classification ?? x.testType,
  );
  if (!type && statusEarly != null) {
    type = inferTypeFromStatus(statusEarly);
  }
  if (!type) return null;

  const id =
    pickString(x, ["id", "testId", "caseId", "test_id", "case_id"]) ??
    `T${String(index + 1).padStart(3, "0")}`;

  const description =
    pickString(x, [
      "description",
      "title",
      "summary",
      "name",
      "scenario",
      "label",
    ]) ?? `Test case ${index + 1}`;

  const reason =
    pickString(x, [
      "reason",
      "rationale",
      "explanation",
      "notes",
      "expectedOutcome",
      "expected_outcome",
      "detail",
    ]) ?? description;

  const payload =
    x.payload ??
    x.body ??
    x.request ??
    x.requestBody ??
    x.input ??
    x.data ??
    null;

  const expectedStatus =
    statusEarly ?? inferDefaultStatus(type);

  return {
    id,
    type,
    description,
    payload,
    expectedStatus,
    reason,
  };
}

export function parseTestCasesFromModelText(raw: string): TestCase[] {
  const unfenced = stripOuterCodeFences(raw);
  let slice = extractTopLevelJsonArray(unfenced);
  slice = relaxTrailingCommas(slice);

  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Could not parse test cases JSON (${msg}). Try Regenerate, or use Endpoint level if the model returned invalid JSON inside a string field.`,
    );
  }

  const arr = coerceTopLevelArray(parsed);
  if (!arr) {
    throw new Error(
      "Expected a JSON array of test cases, or an object with a testCases/tests/cases array.",
    );
  }

  const out = arr
    .map((row, i) => normalizeTestCase(row, i))
    .filter((x): x is TestCase => x != null);

  if (out.length === 0) {
    const hint =
      arr.length > 0
        ? ` The model returned ${arr.length} item(s) but none had a recognized "type" (use valid, invalid, or edge — or positive/negative/security).`
        : "";
    throw new Error(`No valid test cases in array.${hint}`);
  }

  return out;
}
