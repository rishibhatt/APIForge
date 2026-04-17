/** Pull a human-readable message from Groq / Vercel AI SDK errors (incl. 429 rate limits). */
export function groqErrorMessage(error: unknown): string {
  if (error == null) return "Generation failed";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const any = error as Error & {
      statusCode?: number;
      responseBody?: string;
      cause?: unknown;
    };
    if (typeof any.responseBody === "string" && any.responseBody.length > 0) {
      try {
        const j = JSON.parse(any.responseBody) as {
          error?: { message?: string };
        };
        const m = j.error?.message;
        if (typeof m === "string" && m.length > 0) return m;
      } catch {
        /* ignore */
      }
    }
    if (any.cause) {
      const inner = groqErrorMessage(any.cause);
      if (inner && inner !== "Generation failed") return inner;
    }
    return error.message || "Generation failed";
  }
  if (typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "Generation failed";
}

export function isGroqRateLimitError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  const o = error as { statusCode?: number; cause?: unknown };
  if (o.statusCode === 429) return true;
  const msg = groqErrorMessage(error).toLowerCase();
  if (
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("tokens per minute") ||
    msg.includes("tpm") ||
    msg.includes("429")
  ) {
    return true;
  }
  if (o.cause) return isGroqRateLimitError(o.cause);
  return false;
}
