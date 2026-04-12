import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import type { Endpoint } from "@/types/api";
import type { OutputTab } from "@/types/api";
import { buildGroqPrompt } from "@/lib/groq-prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

function isOutputTab(v: unknown): v is OutputTab {
  return (
    v === "typescript" || v === "markdown" || v === "prompt" || v === "snippet"
  );
}

function isEndpoint(v: unknown): v is Endpoint {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.method === "string" &&
    typeof o.path === "string"
  );
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const raw = body as { endpoint?: unknown; type?: unknown };
  if (!isEndpoint(raw.endpoint) || !isOutputTab(raw.type)) {
    return new Response(JSON.stringify({ error: "Invalid endpoint or type" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = buildGroqPrompt(raw.endpoint, raw.type);

  const groq = createGroq({ apiKey });

  const result = streamText({
    model: groq(MODEL),
    prompt,
    temperature: 0.2,
    maxOutputTokens: 4096,
  });

  return result.toTextStreamResponse();
}
