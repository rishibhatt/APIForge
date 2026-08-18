/** Primary model (higher quality, heavier quota use on free tier). */
export const DEFAULT_GROQ_MODEL = "qwen/qwen3.6-27b";

/**
 * Fallback when primary hits 429 / daily limits — much cheaper on TPD.
 * Override with GROQ_MODEL_FALLBACK in .env
 */
export const DEFAULT_GROQ_FALLBACK_MODEL = "qwen/qwen3.6-27b";

export function resolveGroqModels(): { primary: string; fallback: string } {
  const primary =
    process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
  const rawFallback = process.env.GROQ_MODEL_FALLBACK?.trim();
  const fallback =
    rawFallback && rawFallback !== primary
      ? rawFallback
      : DEFAULT_GROQ_FALLBACK_MODEL;
  return { primary, fallback };
}
