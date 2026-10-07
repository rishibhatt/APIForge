import { buildNlPayloadPrompt } from "@/lib/groq-prompts";
import { ai } from "@/lib/ai/service";
import { parseJsonFromModelText } from "@/lib/parse-json-from-model";
import { applyAIResponseHeaders } from "@/lib/groq-token-usage";
import type { Endpoint } from "@/types/api";
import { isEndpoint } from "@/lib/validate-endpoint";
import {
  AI_INPUT_LIMITS,
  classifyAiRequest,
  sanitizeUserText,
} from "@/lib/ai/guardrails";
import { PAYLOAD_SYSTEM } from "@/lib/ai/system-prompts";
import {
  aiBurstGuard,
  aiErrorResponse,
  aiUpstreamErrorResponse,
  applyAiUsageHeaders,
  consumeAiQuota,
} from "@/lib/ai/quota";

import { readJsonObject } from "@/lib/http/read-json-body";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const burst = aiBurstGuard(req);
  if (burst) return burst;

  const parsedBody = await readJsonObject(req);
  if (!parsedBody.ok) {
    return aiErrorResponse(
      req,
      parsedBody.status,
      parsedBody.error,
      parsedBody.status === 400 ? "AI_BAD_INPUT" : undefined,
    );
  }
  const body: unknown = parsedBody.body;

  const raw = body as { endpoint?: unknown; instruction?: unknown };
  if (!isEndpoint(raw.endpoint)) {
    return aiErrorResponse(req, 400, "Invalid endpoint", "AI_BAD_INPUT");
  }
  const instruction = sanitizeUserText(
    raw.instruction,
    AI_INPUT_LIMITS.payloadInstruction,
  );
  if (!instruction) {
    return aiErrorResponse(req, 400, "instruction is required", "AI_BAD_INPUT");
  }

  const verdict = classifyAiRequest(instruction, { hasEndpoint: true });
  if (!verdict.allowed) {
    return aiErrorResponse(req, 422, verdict.message, "AI_OFF_TOPIC");
  }

  const endpoint = raw.endpoint as Endpoint;
  const prompt = buildNlPayloadPrompt(endpoint, instruction);

  const gate = consumeAiQuota(req);
  if (!gate.ok) return gate.response;

  try {
    const res = await ai.generateJSON(
      {
        capability: "structured",
        system: PAYLOAD_SYSTEM,
        prompt,
        temperature: 0.2,
        maxOutputTokens: 2048,
        signal: req.signal,
      },
      (txt) => parseJsonFromModelText(txt as string),
    );

    const headers = applyAiUsageHeaders(
      new Headers({ "Content-Type": "application/json; charset=utf-8" }),
      gate.usage,
    );
    applyAIResponseHeaders(headers, {
      usage: res.usage,
      model: res.model,
      provider: res.provider,
      fallbackUsed: res.fallbackUsed,
    });

    return new Response(JSON.stringify({ payload: res.data }), { status: 200, headers });
  } catch (e) {
    return aiUpstreamErrorResponse(req, e, gate.usage);
  }
}
