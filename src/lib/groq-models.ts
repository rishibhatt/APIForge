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
