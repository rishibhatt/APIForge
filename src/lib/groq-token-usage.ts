import type { AITokenUsage } from "./ai/types";

/** Token counts from AI generations (backward-compatible alias). */
export type GroqTokenUsage = AITokenUsage;
export type { AITokenUsage };

export interface AIMetadata {
  usage: AITokenUsage | null;
  model: string | null;
  provider: string | null;
  fallbackUsed: boolean;
  attempts: string[];
}

function applyUsageHeaders(
  headers: Headers,
  usage: AITokenUsage | undefined,
): void {
  if (!usage) return;
  headers.set("X-AI-Prompt-Tokens", String(usage.promptTokens));
  headers.set("X-AI-Completion-Tokens", String(usage.completionTokens));
  headers.set("X-AI-Total-Tokens", String(usage.totalTokens));
}

export function applyAIResponseHeaders(
  headers: Headers,
  meta?: {
    usage?: AITokenUsage;
    model?: string;
    provider?: string;
    fallbackUsed?: boolean;
    attemptedModels?: string[];
  },
): void {
  if (!meta) return;
  if (meta.usage) {
    applyUsageHeaders(headers, meta.usage);
  }
  if (meta.model) {
    headers.set("X-AI-Model", meta.model);
  }
  if (meta.provider) {
    headers.set("X-AI-Provider", meta.provider);
  }
  if (meta.fallbackUsed != null) {
    headers.set("X-AI-Fallback-Used", meta.fallbackUsed ? "true" : "false");
  }
  if (meta.attemptedModels && meta.attemptedModels.length > 0) {
    headers.set("X-AI-Attempts", meta.attemptedModels.join(","));
  }
}

export function parseUsageFromResponseHeaders(
  h: Headers,
): AITokenUsage | null {
  const p = h.get("X-AI-Prompt-Tokens");
  const c = h.get("X-AI-Completion-Tokens");
  const t = h.get("X-AI-Total-Tokens");
  if (p == null && c == null && t == null) return null;
  const promptTokens = p ? Number(p) : 0;
  const completionTokens = c ? Number(c) : 0;
  const totalTokens =
    t != null && t !== ""
      ? Number(t)
      : promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

export function parseAIMetadataFromHeaders(h: Headers): AIMetadata {
  const usage = parseUsageFromResponseHeaders(h);
  const model = h.get("X-AI-Model");
  const provider = h.get("X-AI-Provider");
  const fallbackUsed = h.get("X-AI-Fallback-Used") === "true";
  const attemptsRaw = h.get("X-AI-Attempts");
  const attempts = attemptsRaw ? attemptsRaw.split(",").map((s) => s.trim()) : [];

  return {
    usage,
    model,
    provider,
    fallbackUsed,
    attempts,
  };
}
