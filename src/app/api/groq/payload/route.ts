import { createGroq } from "@ai-sdk/groq";
import { buildNlPayloadPrompt } from "@/lib/groq-prompts";
import { generateGroqTextBuffered } from "@/lib/groq-generate-buffered";
import { isGroqRateLimitError } from "@/lib/groq-errors";
import { resolveGroqModels } from "@/lib/groq-models";
import { parseJsonFromModelText } from "@/lib/parse-json-from-model";
import { applyUsageHeaders } from "@/lib/groq-token-usage";
import type { Endpoint } from "@/types/api";
import { isEndpoint } from "@/lib/validate-endpoint";

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

  const raw = body as { endpoint?: unknown; instruction?: unknown };
  if (!isEndpoint(raw.endpoint)) {
    return Response.json({ error: "Invalid endpoint" }, { status: 400 });
  }
  const instruction =
    typeof raw.instruction === "string" ? raw.instruction.trim() : "";
  if (!instruction) {
    return Response.json({ error: "instruction is required" }, { status: 400 });
  }

  const endpoint = raw.endpoint as Endpoint;
  const prompt = buildNlPayloadPrompt(endpoint, instruction);
  const groq = createGroq({ apiKey });
  const { primary, fallback } = resolveGroqModels();

  try {
    const { text, usage } = await generateGroqTextBuffered({
      model: groq(primary),
      fallbackModel: groq(fallback),
      system:
        'You are an API integration assistant. Reply with ONLY one JSON value (object or array) — RFC 8259. No markdown fences or commentary. Escape quotes inside strings.',
      prompt,
      temperature: 0.2,
      maxOutputTokens: 2048,
      maxRetries: 1,
    });

    let payload: unknown;
    try {
      payload = parseJsonFromModelText(text);
    } catch {
      return Response.json(
        {
          error:
            "Model output was not valid JSON. Try a simpler instruction or regenerate.",
          rawPreview: text.slice(0, 400),
        },
        { status: 422 },
      );
    }

    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
    applyUsageHeaders(headers, usage);
    return new Response(JSON.stringify({ payload }), { status: 200, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    const status = isGroqRateLimitError(e) ? 429 : 502;
    return Response.json({ error: msg }, { status });
  }
}
