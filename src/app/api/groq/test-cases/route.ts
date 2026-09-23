import { buildTestCasesPrompt } from "@/lib/groq-prompts";
import { ai } from "@/lib/ai/service";
import { getAIErrorMessage, isAIRateLimitError } from "@/lib/ai/errors";
import { applyAIResponseHeaders } from "@/lib/groq-token-usage";
import { parseTestCasesFromModelText } from "@/lib/parse-test-cases-json";
import type { Endpoint, GenerationScope } from "@/types/api";
import {
  isEndpoint,
  isEndpointArray,
  isGenerationScope,
} from "@/lib/validate-endpoint";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body as {
    endpoints?: unknown;
    allEndpoints?: unknown;
    active?: unknown;
    scope?: unknown;
    level?: unknown;
    userInstruction?: unknown;
  };

  const scopeRaw = raw.scope ?? raw.level;

  if (
    !isEndpointArray(raw.endpoints) ||
    !isEndpointArray(raw.allEndpoints) ||
    !isGenerationScope(scopeRaw) ||
    (raw.active != null && !isEndpoint(raw.active))
  ) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const endpoints = raw.endpoints as Endpoint[];
  const allEndpoints = raw.allEndpoints as Endpoint[];
  const scope = scopeRaw as GenerationScope;
  const active = (raw.active ?? null) as Endpoint | null;
  const userInstruction =
    typeof raw.userInstruction === "string" ? raw.userInstruction.trim() : "";

  if (endpoints.length === 0) {
    return Response.json({ error: "No endpoints in scope" }, { status: 400 });
  }

  const prompt = buildTestCasesPrompt(
    endpoints,
    scope,
    allEndpoints,
    active,
    userInstruction || undefined,
  );

  try {
    const res = await ai.generateJSON(
      {
        capability: "structured",
        system:
          'You are a QA engineer. Reply with ONLY one valid JSON array (RFC 8259). No markdown fences or commentary. Every string must escape " and \\\\; no raw newlines inside strings; no trailing commas. Each array item MUST include string fields id, type (only "valid", "invalid", or "edge"), description, reason; number field expectedStatus; and key payload (object or null).',
        prompt,
        temperature: 0.15,
        maxOutputTokens: 4096,
        signal: req.signal,
      },
      (txt) => parseTestCasesFromModelText(txt as string),
    );

    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
    applyAIResponseHeaders(headers, {
      usage: res.usage,
      model: res.model,
      provider: res.provider,
      fallbackUsed: res.fallbackUsed,
    });
    return new Response(JSON.stringify({ testCases: res.data }), { status: 200, headers });
  } catch (e) {
    const msg = getAIErrorMessage(e);
    const status = isAIRateLimitError(e) ? 429 : 422;
    const hint =
      msg.includes("No output") ||
      msg.includes("No content") ||
      msg.includes("NoContentGenerated")
        ? " Try **Endpoint** level first; ensure schemas are not larger than your model context."
        : "";
    return Response.json({ error: `${msg}${hint}` }, { status });
  }
}
