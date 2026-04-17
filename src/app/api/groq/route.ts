import { createGroq } from "@ai-sdk/groq";
import type {
  Endpoint,
  GenerationScope,
  GroqStreamTab,
  IdePromptScope,
} from "@/types/api";
import { buildGroqPrompt } from "@/lib/groq-prompts";
import { generateGroqTextBuffered } from "@/lib/groq-generate-buffered";
import { isGroqRateLimitError } from "@/lib/groq-errors";
import { resolveGroqModels } from "@/lib/groq-models";
import {
  isEndpoint,
  isEndpointArray,
  isGenerationScope,
  isIdePromptScope,
} from "@/lib/validate-endpoint";

export const runtime = "nodejs";
export const maxDuration = 120;

function isGroqStreamTab(v: unknown): v is GroqStreamTab {
  return v === "typescript" || v === "prompt";
}

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
    endpoint?: unknown;
    endpoints?: unknown;
    scope?: unknown;
    type?: unknown;
    idePrompt?: unknown;
    allEndpoints?: unknown;
  };

  if (!isGroqStreamTab(raw.type)) {
    return Response.json({ error: "Invalid type" }, { status: 400 });
  }

  let scopedList: Endpoint[];
  if (isEndpointArray(raw.endpoints) && raw.endpoints.length > 0) {
    scopedList = raw.endpoints;
  } else if (isEndpoint(raw.endpoint)) {
    scopedList = [raw.endpoint];
  } else {
    return Response.json(
      { error: "Invalid endpoint or endpoints" },
      { status: 400 },
    );
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

  const prompt = buildGroqPrompt(primary, raw.type, ide, allEndpoints, {
    scoped: scopedList,
    scope,
  });
  const groq = createGroq({ apiKey });
  const { primary: primaryModel, fallback } = resolveGroqModels();

  try {
    const { text } = await generateGroqTextBuffered({
      model: groq(primaryModel),
      fallbackModel: groq(fallback),
      prompt,
      temperature: raw.type === "prompt" ? 0.35 : 0.2,
      maxOutputTokens: raw.type === "prompt" ? 3072 : 2560,
      maxRetries: 1,
    });

    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const status = isGroqRateLimitError(e) ? 429 : 502;
    return Response.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status },
    );
  }
}
