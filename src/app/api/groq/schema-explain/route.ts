import { ai } from "@/lib/ai/service";
import { getAIErrorMessage, isAIRateLimitError } from "@/lib/ai/errors";
import { applyAIResponseHeaders } from "@/lib/groq-token-usage";
import type { SchemaValidationIssue } from "@/lib/validate-response-against-schema";

export const runtime = "nodejs";
export const maxDuration = 120;

function isIssues(v: unknown): v is SchemaValidationIssue[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (x) =>
      x &&
      typeof x === "object" &&
      typeof (x as { path?: unknown }).path === "string" &&
      typeof (x as { message?: unknown }).message === "string",
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body as {
    issues?: unknown;
    endpointLine?: unknown;
    responsePreview?: unknown;
  };

  if (!isIssues(raw.issues) || raw.issues.length === 0) {
    return Response.json(
      { error: "issues array is required" },
      { status: 400 },
    );
  }

  const endpointLine =
    typeof raw.endpointLine === "string"
      ? raw.endpointLine
      : "Unknown operation";
  const responsePreview =
    typeof raw.responsePreview === "string"
      ? raw.responsePreview.slice(0, 2_000)
      : "";

  const issueText = raw.issues
    .map((i) => `- ${i.path}: ${i.message} (${i.severity})`)
    .join("\n");

  const prompt = `Operation: ${endpointLine}

Structured validation findings:
${issueText}

Response sample (truncated):
${responsePreview || "(empty)"}

Write a short, practical explanation for a backend developer: what likely went wrong, how it relates to the OpenAPI schema, and the next debugging steps. Plain text only, under 12 sentences.`;

  try {
    const res = await ai.generate({
      capability: "general",
      system:
        "You are a senior API engineer. Reply with plain text only — no markdown fences.",
      prompt,
      temperature: 0.25,
      maxOutputTokens: 768,
      maxRetries: 1,
      signal: req.signal,
    });

    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
    applyAIResponseHeaders(headers, {
      usage: res.usage,
      model: res.model,
      provider: res.provider,
      fallbackUsed: res.fallbackUsed,
      attemptedModels: res.attemptedModels,
    });
    return new Response(JSON.stringify({ explanation: res.text }), {
      status: 200,
      headers,
    });
  } catch (e) {
    const msg = getAIErrorMessage(e);
    const status = isAIRateLimitError(e) ? 429 : 502;
    return Response.json({ error: msg }, { status });
  }
}
