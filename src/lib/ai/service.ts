import { executeStreamWithFallback, executeWithFallback } from "./gateway";
import { AIValidationError, getAIErrorMessage } from "./errors";
import { aiObservability } from "./observability";
import type {
  AIGenerateOptions,
  AIMetrics,
  AIResponse,
  AIStreamOptions,
} from "./types";

function extractAndParseJson(text: string): unknown {
  let s = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(s);
  if (fence?.[1]) s = fence[1].trim();
  return JSON.parse(s);
}

export class AIService {
  /**
   * Generates text using the configured capability, with automatic provider failover and FREE model fallbacks.
   */
  public async generate(options: AIGenerateOptions): Promise<AIResponse> {
    return executeWithFallback(options);
  }

  /**
   * Streams response text chunks using the configured capability with automatic model fallback.
   */
  public async stream(options: AIStreamOptions): Promise<ReadableStream<Uint8Array>> {
    return executeStreamWithFallback(options);
  }

  /**
   * Generates structured data with automatic JSON extraction and optional schema/data validation.
   * If parsing fails, retries once with explicit JSON correction prompt.
   */
  public async generateJSON<T = unknown>(
    options: AIGenerateOptions,
    validator?: (data: unknown) => T,
  ): Promise<{
    data: T;
    rawText: string;
    model: string;
    provider?: string;
    usage?: AIResponse["usage"];
    fallbackUsed: boolean;
  }> {
    const capability = options.capability ?? "structured";
    const systemPrompt =
      options.system ||
      "You are an API integration assistant. Reply with ONLY one valid JSON value (object or array) conforming to RFC 8259. No markdown fences, no explanatory commentary.";

    const firstAttempt = await this.generate({
      ...options,
      capability,
      system: systemPrompt,
    });

    try {
      const parsed = validator
        ? validator(firstAttempt.text)
        : (extractAndParseJson(firstAttempt.text) as T);

      return {
        data: parsed,
        rawText: firstAttempt.text,
        model: firstAttempt.model,
        provider: firstAttempt.provider,
        usage: firstAttempt.usage,
        fallbackUsed: firstAttempt.fallbackUsed,
      };
    } catch {
      // Retry once with a structured correction prompt
      try {
        const retryAttempt = await this.generate({
          ...options,
          capability,
          system: systemPrompt,
          prompt: `${options.prompt}\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY strict RFC 8259 JSON now:`,
          temperature: 0.1,
        });

        const parsedRetry = validator
          ? validator(retryAttempt.text)
          : (extractAndParseJson(retryAttempt.text) as T);

        return {
          data: parsedRetry,
          rawText: retryAttempt.text,
          model: retryAttempt.model,
          provider: retryAttempt.provider,
          usage: retryAttempt.usage,
          fallbackUsed: retryAttempt.fallbackUsed,
        };
      } catch (finalErr: unknown) {
        throw new AIValidationError(
          `Failed to parse valid structured JSON from model: ${getAIErrorMessage(finalErr)}`,
          {
            model: firstAttempt.model,
            cause: finalErr,
          },
        );
      }
    }
  }

  /**
   * Returns current AI health, request counts, and fallback metrics.
   */
  public getMetrics(): AIMetrics {
    return aiObservability.getMetrics();
  }
}

export const ai = new AIService();
