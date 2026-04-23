import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { groqErrorMessage, isGroqRateLimitError } from "@/lib/groq-errors";
import { resolveGroqModels } from "@/lib/groq-models";
import { isWorkspaceAssistantAiContext } from "@/lib/workspace-assistant-context";
import {
  WORKSPACE_ASSISTANT_SYSTEM,
  buildAssistantUserPrompt,
  isAssistantPromptKind,
  type AssistantPromptKind,
} from "@/lib/workspace-assistant-prompt";

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
    userQuery?: unknown;
    aiContext?: unknown;
    promptKind?: unknown;
  };

  const userQuery = typeof raw.userQuery === "string" ? raw.userQuery.trim() : "";
  if (!userQuery) {
    return Response.json({ error: "Missing userQuery" }, { status: 400 });
  }

  if (!isWorkspaceAssistantAiContext(raw.aiContext)) {
    return Response.json({ error: "Invalid aiContext" }, { status: 400 });
  }

  const aiContext = raw.aiContext;
  if (!aiContext.endpoint) {
    return Response.json(
      { error: "No endpoint in context. Select an operation first." },
      { status: 400 },
    );
  }

  const promptKind: AssistantPromptKind = isAssistantPromptKind(raw.promptKind)
    ? raw.promptKind
    : "general";

  const userPrompt = buildAssistantUserPrompt(userQuery, aiContext, promptKind);
  const groq = createGroq({ apiKey });
  const { primary } = resolveGroqModels();

  try {
    const result = streamText({
      model: groq(primary),
      system: WORKSPACE_ASSISTANT_SYSTEM,
      prompt: userPrompt,
      temperature: 0.15,
      maxOutputTokens: 3072,
      maxRetries: 1,
      abortSignal: req.signal,
    });

    return result.toTextStreamResponse({
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const status = isGroqRateLimitError(e) ? 429 : 502;
    return Response.json(
      { error: groqErrorMessage(e) },
      { status },
    );
  }
}
