import type { Endpoint } from "@/types/api";
import type {
  GenerationScope,
  GroqStreamTab,
  IdePromptScope,
} from "@/types/api";
import { getScopeLabel } from "@/lib/endpoint-groups";

/** Hard cap on test-case user prompt (Groq free/on-demand TPM is tight; ~4 chars ≈ 1 token). */
const MAX_TEST_PROMPT_CHARS = 9_000;
const MAX_FULL_SCHEMA_ENDPOINTS = 8;
/** Per-operation cap when embedding full OpenAPI fragments (avoids huge prompts). */
const MAX_CHARS_PER_DETAIL_BLOCK = 3_200;
/** Single-endpoint mode: summarized schema + parameters budgets (keeps input under low TPM tiers). */
const MAX_TEST_PARAM_HINT_CHARS = 700;
const MAX_TEST_SCHEMA_CHARS = 2_000;

const TEST_PROMPT_SKIP_KEYS = new Set([
  "description",
  "title",
  "summary",
  "example",
  "examples",
  "externalDocs",
  "xml",
  "deprecated",
]);

/**
 * Compact OpenAPI/JSON Schema for test prompts: drops prose, caps depth/breadth, then hard-trims.
 * Avoids multi‑thousand-token payloads on Groq on-demand TPM limits.
 */
function summarizeForTestPrompt(value: unknown, maxChars: number): string {
  const prune = (v: unknown, depth: number): unknown => {
    if (v == null) return v;
    const t = typeof v;
    if (t === "string") {
      const s = v as string;
      return s.length > 100 ? `${s.slice(0, 100)}…` : s;
    }
    if (t === "number" || t === "boolean") return v;
    if (depth > 6) return "?";
    if (Array.isArray(v)) {
      if (v.length === 0) return [];
      const n = depth >= 3 ? 2 : 5;
      const head = v.slice(0, n).map((x) => prune(x, depth + 1));
      if (v.length > n) return [...head, `+${v.length - n} more`];
      return head;
    }
    if (t !== "object") return String(v);
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).filter(
      (k) => !TEST_PROMPT_SKIP_KEYS.has(k) && !k.startsWith("x-"),
    );
    const maxKeys = depth >= 2 ? 14 : 28;
    const out: Record<string, unknown> = {};
    for (let i = 0; i < keys.length && i < maxKeys; i++) {
      const k = keys[i]!;
      out[k] = prune(o[k], depth + 1);
    }
    if (keys.length > maxKeys) {
      out["…"] = `+${keys.length - maxKeys} keys`;
    }
    return out;
  };

  try {
    const slim = prune(value, 0);
    let s = JSON.stringify(slim);
    if (s.length <= maxChars) return s;
    s = s.slice(0, maxChars);
    const cut = s.lastIndexOf(",");
    if (cut > maxChars - 120) s = s.slice(0, cut);
    return `${s}\n/* …trimmed */`;
  } catch {
    return '"[unserializable]"';
  }
}

function endpointBlock(ep: Endpoint): string {
  return JSON.stringify(
    {
      method: ep.method,
      path: ep.path,
      summary: ep.summary,
      parameters: ep.parameters,
      requestBody: ep.requestBody,
      responses: ep.responses,
    },
    null,
    2,
  );
}

const typeInstructions: Record<GroqStreamTab, string> = {
  typescript: `TypeScript types and interfaces only (no prose).
Strict typing. Use export. Match schema field names exactly.`,
  prompt: ``, // handled in buildIdePastePrompt
};

function buildIdePastePrompt(
  primary: Endpoint,
  ide: IdePromptScope,
  allEndpointsForHeading: Endpoint[],
): string {
  const scopeSummary = getScopeLabel(
    allEndpointsForHeading,
    primary,
    ide.scope,
    ide.operations,
  );
  const scopeLevelHuman =
    ide.scope === "endpoint"
      ? "endpoint"
      : ide.scope === "collection"
        ? "collection"
        : "full API";
  const endpointsLines = ide.operations
    .map((e) => {
      const sum = (e.summary ?? "").replace(/\s+/g, " ").trim();
      return `- ${e.method} ${e.path}${sum ? ` — ${sum}` : ""}`;
    })
    .join("\n");

  const primaryDetail = endpointBlock(primary);

  return `You are an expert technical writer for developer tooling.

GENERATION SCOPE LEVEL: ${scopeLevelHuman}
SCOPE SUMMARY: ${scopeSummary}
PRIMARY OPERATION (sidebar selection): ${primary.method} ${primary.path}

Full definition of the PRIMARY operation (authoritative for that operation):
${primaryDetail}

All operations in this scope (method, path, summary — one block):
${endpointsLines}

YOUR TASK — produce ONE thing only:
Write a single, copy-pasteable **meta-prompt** (plain text or markdown) that a developer will paste into Cursor, Windsurf, Antigravity, GitHub Copilot Chat, or any other IDE AI assistant.

STRICT OUTPUT RULES:
- Output ONLY the meta-prompt text itself — the text the user will paste into their IDE.
- Do NOT generate application code (no TypeScript, no React, no fetch implementations, no Zod, no tests).
- Do NOT use sub-sections like "Frontend" / "QA" / templates — one cohesive prompt only.
- The meta-prompt should instruct the downstream AI to help integrate with this API scope (client code, error handling, and validation can be *requested inside that meta-prompt* as bullet goals, but YOU do not implement them here).
- Include in the meta-prompt: API context (methods + paths), constraints (auth, idempotency if known), and clear deliverables the IDE AI should produce.
- Keep it actionable and under ~120 lines.

Again: your entire reply must be the meta-prompt only — no preamble like "Here is your prompt".`;
}

export function buildGroqPrompt(
  primary: Endpoint,
  type: GroqStreamTab,
  ide?: IdePromptScope,
  allEndpoints?: Endpoint[],
  opts?: { scoped: Endpoint[]; scope: GenerationScope },
): string {
  const scoped = opts?.scoped ?? [primary];
  const generationScope = opts?.scope ?? "endpoint";

  if (type === "prompt") {
    const ideScope =
      ide ??
      ({
        scope: generationScope,
        operations: scoped,
      } satisfies IdePromptScope);
    const all = allEndpoints?.length ? allEndpoints : ideScope.operations;
    return buildIdePastePrompt(primary, ideScope, all);
  }

  const spec = typeInstructions[type];

  if (scoped.length === 1) {
    const data = endpointBlock(primary);
    return `You are an expert API engineer.

Given this endpoint:
${data}

Generate:
${spec}

Rules:
Production ready
Typed
Clean
No explanations`;
  }

  const blocks = scoped.map(endpointBlock).join("\n\n---\n\n");
  return `You are an expert API engineer.

Generation scope: ${generationScope} (${scoped.length} operations).

You are given multiple OpenAPI operations as JSON blocks below. Produce ONE TypeScript module covering all of them.

Operations:
${blocks}

Generate:
${spec}

Additional rules:
- Merge schemas across operations; deduplicate named types (each interface/type alias name must appear at most once; unify compatible shapes).
- Prefer shared interfaces where the same structure repeats.
- Production ready. Typed. Clean. No explanations—TypeScript only.`;
}

function extractRequestSchema(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const content = o.content;
  if (!content || typeof content !== "object") return body;
  const json = (content as Record<string, unknown>)["application/json"];
  if (json && typeof json === "object" && "schema" in json) {
    return (json as { schema?: unknown }).schema ?? json;
  }
  return body;
}

function compactOperationLine(ep: Endpoint): string {
  const sum = (ep.summary ?? "").replace(/\s+/g, " ").slice(0, 100);
  const tag = ep.tags?.[0] ?? "";
  return `${ep.method}\t${ep.path}\t${tag}\t${sum}`;
}

function pickFullDetailEndpoints(
  endpoints: Endpoint[],
  active: Endpoint | null,
  max: number,
): Endpoint[] {
  const out: Endpoint[] = [];
  const seen = new Set<string>();
  if (active) {
    const hit = endpoints.find((e) => e.id === active.id);
    if (hit) {
      out.push(hit);
      seen.add(hit.id);
    }
  }
  const withBody = endpoints.filter(
    (e) => e.requestBody != null && !seen.has(e.id),
  );
  const rest = endpoints.filter((e) => !seen.has(e.id));
  for (const ep of [...withBody, ...rest]) {
    if (out.length >= max) break;
    out.push(ep);
    seen.add(ep.id);
  }
  return out;
}

function trimPromptIfNeeded(prompt: string): string {
  if (prompt.length <= MAX_TEST_PROMPT_CHARS) return prompt;
  return `${prompt.slice(0, MAX_TEST_PROMPT_CHARS)}\n\n[TRUNCATED: spec too large for this request — try a smaller operation in the spec or a narrower Level.]`;
}

export function buildTestCasesPrompt(
  endpoints: Endpoint[],
  scope: GenerationScope,
  allEndpoints: Endpoint[],
  active: Endpoint | null,
  userInstruction?: string,
): string {
  const anchor = active ?? allEndpoints[0] ?? null;
  const scopeLine = `Generation scope: ${getScopeLabel(allEndpoints, anchor, scope, endpoints)}`;

  const userBlock =
    userInstruction && userInstruction.length > 0
      ? `\n\nUser focus (prioritize scenarios that satisfy this intent; still obey the system JSON rules):\n${userInstruction}\n`
      : "";

  if (endpoints.length === 1) {
    const ep = endpoints[0]!;
    const requestSchema = extractRequestSchema(ep.requestBody);
    const responseSchema = ep.responses ?? null;
    const paramHint = summarizeForTestPrompt(ep.parameters, MAX_TEST_PARAM_HINT_CHARS);
    const reqHint = summarizeForTestPrompt(requestSchema, MAX_TEST_SCHEMA_CHARS);
    const resHint = summarizeForTestPrompt(responseSchema, MAX_TEST_SCHEMA_CHARS);
    return trimPromptIfNeeded(`Endpoint (summarized for token budget):
${ep.method} ${ep.path}
${scopeLine}

Parameters (compact): ${paramHint}
Request body schema (compact): ${reqHint}
Response schema (compact): ${resHint}
${userBlock}
Task: produce 8-10 JSON test cases (valid, invalid, edge) matching the request body shape. Small example payloads only. Follow the system message for JSON formatting.

Each object MUST use these exact keys and types:
- "id": string (e.g. "T001")
- "type": string, exactly one of "valid", "invalid", "edge" (lowercase)
- "description": string
- "payload": object or null
- "expectedStatus": number (e.g. 200), not a string
- "reason": string

Return ONLY one JSON array, no other text.`);
  }

  const full = pickFullDetailEndpoints(
    endpoints,
    active,
    MAX_FULL_SCHEMA_ENDPOINTS,
  );
  const fullSet = new Set(full.map((e) => e.id));
  const compact = endpoints.filter((e) => !fullSet.has(e.id));

  const fullBlocks = full
    .map((ep) => {
      const block = endpointBlock(ep);
      const body =
        block.length <= MAX_CHARS_PER_DETAIL_BLOCK
          ? block
          : `${block.slice(0, MAX_CHARS_PER_DETAIL_BLOCK)}\n/* …truncated ${block.length - MAX_CHARS_PER_DETAIL_BLOCK} chars */`;
      return `### ${ep.method} ${ep.path}\n${body}`;
    })
    .join("\n\n");

  const compactLines = compact.map(compactOperationLine).join("\n");

  const prompt = `You are a QA engineer. ${scopeLine}

The API has ${endpoints.length} operations in this scope. Below, ${full.length} operations include FULL OpenAPI-style detail (use these for precise request payloads). The remaining operations appear as a compact list only — for those, infer minimal realistic payloads from method + path + summary, or use {} for GET/DELETE with no body.

FULL DETAIL (payloads must respect these schemas):
${fullBlocks}

COMPACT INVENTORY (method, path, tag, summary — for coverage only):
${compactLines || "(none — all listed above in full detail.)"}
${userBlock}
Generate a combined JSON array of 8-12 test cases total across this scope (distribute across endpoints; ids T001, T002, …).
Each item must name the target in "description", e.g. "[POST /login] invalid password".

Each object MUST use: id (string), type (exactly "valid", "invalid", or "edge"), description (string), payload (object or null), expectedStatus (number), reason (string). Do not use synonyms for type; do not quote expectedStatus as a string.
Payloads must be small (short literals only). Strings must be valid JSON: escape quotes and backslashes; no raw line breaks inside strings; no trailing commas.
Return ONLY a valid JSON array. No markdown, no prose outside JSON.`;

  return trimPromptIfNeeded(prompt);
}

function endpointBlockCompact(ep: Endpoint): string {
  return JSON.stringify(
    {
      method: ep.method,
      path: ep.path,
      summary: ep.summary,
      parameters: ep.parameters,
      requestBody: ep.requestBody,
    },
    null,
    2,
  );
}

/**
 * Natural-language payload generation: model returns JSON only (enforced by route system message).
 */
export function buildNlPayloadPrompt(
  endpoint: Endpoint,
  userInstruction: string,
): string {
  const requestSchema = extractRequestSchema(endpoint.requestBody);
  const paramHint = summarizeForTestPrompt(endpoint.parameters, MAX_TEST_PARAM_HINT_CHARS);
  const reqHint = summarizeForTestPrompt(requestSchema, MAX_TEST_SCHEMA_CHARS);
  const block = endpointBlockCompact(endpoint);
  return `Operation (authoritative):
${block}

Parameters (compact): ${paramHint}
Request body schema (compact): ${reqHint}

User request:
${userInstruction}

Return ONE JSON value only: usually an object matching the request body schema (include query/path fields inside the same object if that helps the client; prefer flat keys matching parameter names). For multipart/file APIs, return a JSON object whose keys are part/field names and values describe dummy content (e.g. { "avatar": "<png bytes described as base64 placeholder>" }) — still valid JSON, no binary.`;
}
