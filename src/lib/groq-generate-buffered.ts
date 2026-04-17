import { generateText } from "ai";
import { groqErrorMessage, isGroqRateLimitError } from "@/lib/groq-errors";

type ChatModel = Parameters<typeof generateText>[0]["model"];

export type BufferedGroqParams = {
  model: ChatModel;
  fallbackModel: ChatModel;
  prompt: string;
  system?: string;
  temperature: number;
  maxOutputTokens: number;
  maxRetries?: number;
};

/**
 * Non-streaming Groq call with automatic fallback model on rate limit (429 / TPD).
 */
export async function generateGroqTextBuffered(
  params: BufferedGroqParams,
): Promise<{ text: string; usedFallback: boolean }> {
  const {
    model,
    fallbackModel,
    prompt,
    system,
    temperature,
    maxOutputTokens,
    maxRetries = 1,
  } = params;

  const run = (m: ChatModel) =>
    generateText({
      model: m,
      ...(system ? { system } : {}),
      prompt,
      temperature,
      maxOutputTokens,
      maxRetries,
    });

  try {
    const r = await run(model);
    const text = r.text?.trim() ?? "";
    if (!text) {
      throw new Error(
        "The model returned empty text. Try again or set GROQ_MODEL to a smaller model.",
      );
    }
    return { text, usedFallback: false };
  } catch (e) {
    if (!isGroqRateLimitError(e)) {
      throw new Error(groqErrorMessage(e));
    }
    try {
      const r = await run(fallbackModel);
      const text = r.text?.trim() ?? "";
      if (!text) {
        throw new Error(groqErrorMessage(e));
      }
      return { text, usedFallback: true };
    } catch (e2) {
      throw new Error(
        `${groqErrorMessage(e2)}\n\nIf you are on Groq free tier: daily token limits are low on large models. Set GROQ_MODEL=llama-3.1-8b-instant or wait for the reset time shown above.`,
      );
    }
  }
}
