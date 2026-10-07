import { ai } from "@/lib/ai/service";
import { isWorkspaceAssistantAiContext } from "@/lib/workspace-assistant-context";
import {
  WORKSPACE_ASSISTANT_SYSTEM,
  buildAssistantUserPrompt,
  isAssistantPromptKind,
  type AssistantPromptKind,
} from "@/lib/workspace-assistant-prompt";
import {
  AI_INPUT_LIMITS,
  classifyAiRequest,
  sanitizeUserText,
} from "@/lib/ai/guardrails";
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
    userQuery?: unknown;
    aiContext?: unknown;
    promptKind?: unknown;
  };

  const userQuery = sanitizeUserText(raw.userQuery, AI_INPUT_LIMITS.assistantQuery);
  if (!userQuery) {
    return aiErrorResponse(req, 400, "Missing userQuery", "AI_BAD_INPUT");
  }

  if (!isWorkspaceAssistantAiContext(raw.aiContext)) {
    return aiErrorResponse(req, 400, "Invalid aiContext", "AI_BAD_INPUT");
  }

  const aiContext = raw.aiContext;
  if (!aiContext.endpoint) {
    return aiErrorResponse(
      req,
      400,
      "No endpoint in context. Select an operation first.",
      "AI_BAD_INPUT",
    );
  }

  const verdict = classifyAiRequest(userQuery, { hasEndpoint: true });
  if (!verdict.allowed) {
    return aiErrorResponse(req, 422, verdict.message, "AI_OFF_TOPIC");
  }

  const promptKind: AssistantPromptKind = isAssistantPromptKind(raw.promptKind)
    ? raw.promptKind
    : "general";

  const userPrompt = buildAssistantUserPrompt(userQuery, aiContext, promptKind);

  // Valid and on-topic: now (and only now) count it against the quota.
  const gate = consumeAiQuota(req);
  if (!gate.ok) return gate.response;

  try {
    const stream = await ai.stream({
      capability: "assistant",
      system: WORKSPACE_ASSISTANT_SYSTEM,
      prompt: userPrompt,
      temperature: 0.15,
      maxOutputTokens: 2048,
      signal: req.signal,
    });

    const headers = applyAiUsageHeaders(
      new Headers({
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      }),
      gate.usage,
    );
    return new Response(stream, { headers });
  } catch (e) {
    return aiUpstreamErrorResponse(req, e, gate.usage);
  }
}
