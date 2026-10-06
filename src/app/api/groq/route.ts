import type {
  Endpoint,
  GenerationScope,
  GroqStreamTab,
  IdePromptScope,
} from "@/types/api";
import {
  buildGroqPrompt,
  buildGroqSystem,
  buildPromptOverrides,
  type PromptApiMeta,
} from "@/lib/groq-prompts";
import {
  aiBurstGuard,
  aiErrorResponse,
  aiUpstreamErrorResponse,
  applyAiUsageHeaders,
  consumeAiQuota,
} from "@/lib/ai/quota";
import { extractTypeScriptBlock, normalizePromptMarkdown } from "@/lib/ai/output";
import { sanitizeUserText } from "@/lib/ai/guardrails";
import { ai } from "@/lib/ai/service";
import { applyAIResponseHeaders } from "@/lib/groq-token-usage";
import {
  isEndpoint,
  isEndpointArray,
  isGenerationScope,
  isIdePromptScope,
} from "@/lib/validate-endpoint";

import { readJsonObject } from "@/lib/http/read-json-body";

export const runtime = "nodejs";
export const maxDuration = 120;

function isGroqStreamTab(v: unknown): v is GroqStreamTab {
  return v === "typescript" || v === "prompt";
}

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
    endpoint?: unknown;
    endpoints?: unknown;
    scope?: unknown;
    type?: unknown;
    idePrompt?: unknown;
    allEndpoints?: unknown;
    specTitle?: unknown;
    serverUrls?: unknown;
    securitySchemes?: unknown;
  };

  if (!isGroqStreamTab(raw.type)) {
    return aiErrorResponse(req, 400, "Invalid type", "AI_BAD_INPUT");
  }

  let scopedList: Endpoint[];
  if (isEndpointArray(raw.endpoints) && raw.endpoints.length > 0) {
    scopedList = raw.endpoints;
  } else if (isEndpoint(raw.endpoint)) {
    scopedList = [raw.endpoint];
  } else {
    return aiErrorResponse(req, 400, "Invalid endpoint or endpoints", "AI_BAD_INPUT");
  }

  const primary = isEndpoint(raw.endpoint) ? raw.endpoint : scopedList[0]!;
  const scope: GenerationScope = isGenerationScope(raw.scope)
    ? raw.scope
    : "endpoint";

  const allEndpoints = isEndpointArray(raw.allEndpoints)
    ? raw.allEndpoints
    : scopedList;

  let ide: IdePromptScope | undefined;
  if (raw.type === "prompt") {
    if (isIdePromptScope(raw.idePrompt)) {
      const p = raw.idePrompt as IdePromptScope & { level?: GenerationScope };
      ide = {
        scope: p.scope ?? p.level ?? scope,
        operations: p.operations,
      };
    } else {
      ide = { scope, operations: scopedList };
    }
  }

  // Optional API-level facts (the client may send them; absent => "Not specified in the spec").
  const meta: PromptApiMeta = {
    specTitle: sanitizeUserText(raw.specTitle, 200) || undefined,
    serverUrls: Array.isArray(raw.serverUrls)
      ? raw.serverUrls
          .filter((u): u is string => typeof u === "string")
          .map((u) => sanitizeUserText(u, 300))
          .filter(Boolean)
          .slice(0, 5)
      : undefined,
    securitySchemes:
      raw.securitySchemes &&
      typeof raw.securitySchemes === "object" &&
      !Array.isArray(raw.securitySchemes)
        ? (raw.securitySchemes as Record<string, unknown>)
        : undefined,
  };

  const prompt = buildGroqPrompt(primary, raw.type, ide, allEndpoints, {
    scoped: scopedList,
    scope,
    meta,
  });

  // Validation passed: count this request against the visitor quota before the model call.
  const gate = consumeAiQuota(req);
  if (!gate.ok) return gate.response;

  try {
    const res = await ai.generate({
      capability: "general",
      system: buildGroqSystem(raw.type),
      prompt,
      temperature: raw.type === "prompt" ? 0.3 : 0.1,
      maxOutputTokens: raw.type === "prompt" ? 3072 : 4096,
      maxRetries: 1,
      signal: req.signal,
    });

    const text =
      raw.type === "typescript"
        ? extractTypeScriptBlock(res.text)
        : normalizePromptMarkdown(
            res.text,
            buildPromptOverrides(ide?.operations?.length ? ide.operations : scopedList, meta),
          );

    const headers = new Headers({
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    applyAiUsageHeaders(headers, gate.usage);
    applyAIResponseHeaders(headers, {
      usage: res.usage,
      model: res.model,
      provider: res.provider,
      fallbackUsed: res.fallbackUsed,
      attemptedModels: res.attemptedModels,
    });

    return new Response(text, {
      status: 200,
      headers,
    });
  } catch (e) {
    return aiUpstreamErrorResponse(req, e, gate.usage);
  }
}
