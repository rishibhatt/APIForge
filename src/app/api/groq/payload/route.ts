import { buildNlPayloadPrompt } from "@/lib/groq-prompts";
import { ai } from "@/lib/ai/service";
import { getAIErrorMessage, isAIRateLimitError } from "@/lib/ai/errors";
import { parseJsonFromModelText } from "@/lib/parse-json-from-model";
import { applyAIResponseHeaders } from "@/lib/groq-token-usage";
import type { Endpoint } from "@/types/api";
import { isEndpoint } from "@/lib/validate-endpoint";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
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

  try {
    const res = await ai.generateJSON(
      {
        capability: "structured",
        system:
          "You are an API integration assistant. Reply with ONLY one JSON value (object or array) — RFC 8259. No markdown fences or commentary. Escape quotes inside strings.",
        prompt,
        temperature: 0.2,
        maxOutputTokens: 2048,
        signal: req.signal,
      },
      (txt) => parseJsonFromModelText(txt as string),
    );

    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
    applyAIResponseHeaders(headers, {
      usage: res.usage,
      model: res.model,
      provider: res.provider,
      fallbackUsed: res.fallbackUsed,
    });

    return new Response(JSON.stringify({ payload: res.data }), { status: 200, headers });
  } catch (e) {
    const msg = getAIErrorMessage(e);
    const status = isAIRateLimitError(e) ? 429 : 502;
    return Response.json({ error: msg }, { status });
  }
}
