import { ai } from "./ai/service";
import { groqErrorMessage } from "./groq-errors";
import type { GroqTokenUsage } from "./groq-token-usage";

export type BufferedGroqParams = {
  model?: unknown;
  fallbackModel?: unknown;
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  maxRetries?: number;
};

/**
 * Non-streaming AI call with automatic fallback model on rate limit / downtime (backward-compatible bridge).
 */
export async function generateGroqTextBuffered(
  params: BufferedGroqParams,
): Promise<{
  text: string;
  usedFallback: boolean;
  usage?: GroqTokenUsage;
}> {
  try {
    const res = await ai.generate({
      capability: "general",
      prompt: params.prompt,
      system: params.system,
      temperature: params.temperature ?? 0.2,
      maxOutputTokens: params.maxOutputTokens ?? 2560,
      maxRetries: params.maxRetries ?? 1,
    });

    return {
      text: res.text,
      usedFallback: res.fallbackUsed,
      usage: res.usage,
    };
  } catch (err) {
    throw new Error(groqErrorMessage(err));
  }
}
