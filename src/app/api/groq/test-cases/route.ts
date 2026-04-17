import { createGroq } from "@ai-sdk/groq";
import { buildTestCasesPrompt } from "@/lib/groq-prompts";
import { generateGroqTextBuffered } from "@/lib/groq-generate-buffered";
import { isGroqRateLimitError } from "@/lib/groq-errors";
import { resolveGroqModels } from "@/lib/groq-models";
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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 },
    );
  }

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

  if (endpoints.length === 0) {
    return Response.json({ error: "No endpoints in scope" }, { status: 400 });
  }

  const prompt = buildTestCasesPrompt(endpoints, scope, allEndpoints, active);
  const groq = createGroq({ apiKey });
  const { primary, fallback } = resolveGroqModels();

  try {
    const { text } = await generateGroqTextBuffered({
      model: groq(primary),
      fallbackModel: groq(fallback),
      system:
        'You are a QA engineer. Reply with ONLY one valid JSON array (RFC 8259). No markdown fences or commentary. Every string must escape " and \\\\; no raw newlines inside strings; no trailing commas. Each array item MUST include string fields id, type (only "valid", "invalid", or "edge"), description, reason; number field expectedStatus; and key payload (object or null).',
      prompt,
      temperature: 0.15,
      /** Keep output moderate — large completions add to TPM on some tiers. */
      maxOutputTokens: 4096,
      maxRetries: 1,
    });

    const testCases = parseTestCasesFromModelText(text);
    return Response.json({ testCases });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    const status = isGroqRateLimitError(e) ? 429 : 422;
    const hint =
      msg.includes("No output") ||
      msg.includes("No content") ||
      msg.includes("NoContentGenerated")
        ? " Try **Endpoint** level first; ensure schemas are not larger than your model context."
        : "";
    return Response.json({ error: `${msg}${hint}` }, { status });
  }
}
