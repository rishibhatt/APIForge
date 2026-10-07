import { buildTestCasesPrompt } from "@/lib/groq-prompts";
import { ai } from "@/lib/ai/service";
import { applyAIResponseHeaders } from "@/lib/groq-token-usage";
import { parseTestCasesFromModelText } from "@/lib/parse-test-cases-json";
import type { Endpoint, GenerationScope } from "@/types/api";
import {
  isEndpoint,
  isEndpointArray,
  isGenerationScope,
} from "@/lib/validate-endpoint";
import {
  AI_INPUT_LIMITS,
  classifyAiRequest,
  sanitizeUserText,
} from "@/lib/ai/guardrails";
import { TEST_CASES_SYSTEM } from "@/lib/ai/system-prompts";
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
    return aiErrorResponse(req, 400, "Invalid request body", "AI_BAD_INPUT");
  }

  const endpoints = raw.endpoints as Endpoint[];
  const allEndpoints = raw.allEndpoints as Endpoint[];
  const scope = scopeRaw as GenerationScope;
  const active = (raw.active ?? null) as Endpoint | null;
  const userInstruction = sanitizeUserText(
    raw.userInstruction,
    AI_INPUT_LIMITS.testCaseInstruction,
  );

  if (endpoints.length === 0) {
    return aiErrorResponse(req, 400, "No endpoints in scope", "AI_BAD_INPUT");
  }

  if (userInstruction) {
    const verdict = classifyAiRequest(userInstruction, { hasEndpoint: true });
    if (!verdict.allowed) {
      return aiErrorResponse(req, 422, verdict.message, "AI_OFF_TOPIC");
    }
  }

  const prompt = buildTestCasesPrompt(
    endpoints,
    scope,
    allEndpoints,
    active,
    userInstruction || undefined,
  );

  const gate = consumeAiQuota(req);
  if (!gate.ok) return gate.response;

  try {
    const res = await ai.generateJSON(
      {
        capability: "structured",
        system: TEST_CASES_SYSTEM,
        prompt,
        temperature: 0.15,
        maxOutputTokens: 4096,
        signal: req.signal,
      },
      (txt) => parseTestCasesFromModelText(txt as string),
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
    return new Response(JSON.stringify({ testCases: res.data }), { status: 200, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const hint =
      msg.includes("No output") ||
      msg.includes("No content") ||
      msg.includes("NoContentGenerated")
        ? " Try **Endpoint** level first; ensure schemas are not larger than your model context."
        : "";
    // Non-upstream failures here are unparseable model output: keep the historical 422.
    return aiUpstreamErrorResponse(req, e, gate.usage, { fallbackStatus: 422, hint });
  }
}
