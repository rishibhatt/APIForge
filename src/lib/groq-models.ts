<<<<<<< HEAD
import {
  DEFAULT_FREE_FALLBACK_MODELS,
  DEFAULT_FREE_PRIMARY_MODEL,
  resolveCapabilityConfig,
} from "./ai/config";

/** Primary model (backward compatible alias). */
export const DEFAULT_GROQ_MODEL = DEFAULT_FREE_PRIMARY_MODEL;

/** Fallback model (backward compatible alias). */
export const DEFAULT_GROQ_FALLBACK_MODEL = DEFAULT_FREE_FALLBACK_MODELS[0]!;

export function resolveGroqModels(): { primary: string; fallback: string } {
  const { primary, fallbacks } = resolveCapabilityConfig("general");
  return { primary, fallback: fallbacks[0] || DEFAULT_GROQ_FALLBACK_MODEL };
}
=======
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
>>>>>>> 6190541292fa6a5a79a4fe677ad0b0ee41020a49
