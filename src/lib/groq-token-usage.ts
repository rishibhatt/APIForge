/** Token counts from Vercel AI SDK `generateText` (field names vary by version). */
export type GroqTokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export function usageFromGenerateTextResult(r: {
  usage?: unknown;
}): GroqTokenUsage | undefined {
  const u = r.usage;
  if (!u || typeof u !== "object") return undefined;
  const o = u as Record<string, unknown>;
  const p =
    typeof o.promptTokens === "number"
      ? o.promptTokens
      : typeof o.inputTokens === "number"
        ? o.inputTokens
        : undefined;
  const c =
    typeof o.completionTokens === "number"
      ? o.completionTokens
      : typeof o.outputTokens === "number"
        ? o.outputTokens
        : undefined;
  const t = typeof o.totalTokens === "number" ? o.totalTokens : undefined;
  if (p == null && c == null && t == null) return undefined;
  const promptTokens = p ?? 0;
  const completionTokens = c ?? 0;
  const totalTokens =
    t ?? (promptTokens > 0 || completionTokens > 0
      ? promptTokens + completionTokens
      : 0);
  return { promptTokens, completionTokens, totalTokens };
}

export function applyUsageHeaders(
  headers: Headers,
  usage: GroqTokenUsage | undefined,
): void {
  if (!usage) return;
  headers.set("X-AI-Prompt-Tokens", String(usage.promptTokens));
  headers.set("X-AI-Completion-Tokens", String(usage.completionTokens));
  headers.set("X-AI-Total-Tokens", String(usage.totalTokens));
}

export function parseUsageFromResponseHeaders(
  h: Headers,
): GroqTokenUsage | null {
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
