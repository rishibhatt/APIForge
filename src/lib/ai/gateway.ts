import { getPrioritizedGateways, resolveCapabilityConfig } from "./config";
import {
  AIError,
  AIModelUnavailableError,
  AIProviderError,
  AIRateLimitError,
  getAIErrorMessage,
  isAIModelUnavailableError,
  isAIRateLimitError,
} from "./errors";
import { aiObservability } from "./observability";
import type {
  AIGenerateOptions,
  AIMessage,
  AIResponse,
  AIStreamOptions,
  AITokenUsage,
} from "./types";

interface ChatCompletionResponse {
  id?: string;
  model?: string;
  provider?: string;
  choices?: Array<{
    index?: number;
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    code?: number | string;
    metadata?: unknown;
  };
}

function normalizeMessages(options: AIGenerateOptions): AIMessage[] {
  if (options.messages && options.messages.length > 0) {
    if (options.system) {
      const hasSystem = options.messages.some((m) => m.role === "system");
      if (!hasSystem) {
        return [{ role: "system", content: options.system }, ...options.messages];
      }
    }
    return options.messages;
  }

  const msgs: AIMessage[] = [];
  if (options.system) {
    msgs.push({ role: "system", content: options.system });
  }
  msgs.push({ role: "user", content: options.prompt });
  return msgs;
}

function parseUsage(usage?: ChatCompletionResponse["usage"]): AITokenUsage | undefined {
  if (!usage) return undefined;
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

/**
 * Execute a single chat completion HTTP request with bounded timeout.
 */
async function callChatEndpoint(
  model: string,
  messages: AIMessage[],
  options: AIGenerateOptions,
  gateway: { baseURL: string; apiKey: string; name: string },
): Promise<AIResponse> {
  const t0 = performance.now();

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxOutputTokens ?? 3072,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${gateway.apiKey}`,
  };

  if (gateway.name === "OpenRouter") {
    headers["HTTP-Referer"] = "https://apiforge.dev";
    headers["X-Title"] = "APIForge";
  }

  // 6-second timeout per single attempt to guarantee rapid failover without hanging
  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), 6000);

  let res: Response;
  try {
    const combinedSignal = options.signal
      ? (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal }).any
        ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any([options.signal, timeoutCtrl.signal])
        : options.signal
      : timeoutCtrl.signal;

    res = await fetch(`${gateway.baseURL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: combinedSignal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if ((err as Error)?.name === "AbortError" && options.signal?.aborted) {
      throw err;
    }
    throw new AIProviderError(
      `Gateway ${gateway.name} request timed out or failed: ${(err as Error)?.message || "Network error"}`,
      { model, provider: gateway.name, cause: err },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const latencyMs = Math.round(performance.now() - t0);
  const resText = await res.text();

  let json: ChatCompletionResponse;
  try {
    json = JSON.parse(resText);
  } catch {
    throw new AIProviderError(`AI Gateway ${gateway.name} returned HTTP ${res.status}`, {
      statusCode: res.status,
      model,
      provider: gateway.name,
    });
  }

  if (!res.ok || json.error) {
    const errorMsg = json.error?.message || `AI Gateway ${gateway.name} returned status ${res.status}`;
    const statusCode = res.status || (typeof json.error?.code === "number" ? json.error.code : 500);

    if (statusCode === 429 || isAIRateLimitError(errorMsg)) {
      throw new AIRateLimitError(errorMsg, { model, provider: gateway.name });
    }

    if (statusCode === 404 || statusCode === 410 || isAIModelUnavailableError(errorMsg)) {
      throw new AIModelUnavailableError(errorMsg, { model, provider: gateway.name });
    }

    throw new AIProviderError(errorMsg, { statusCode, model, provider: gateway.name });
  }

  const choice = json.choices?.[0];
  const content = choice?.message?.content?.trim() ?? "";
  const actualModel = json.model || model;

  return {
    text: content,
    model: actualModel,
    provider: json.provider || gateway.name,
    usage: parseUsage(json.usage),
    latencyMs,
    fallbackUsed: false,
  };
}

/**
 * Executes a resilient, ultra-fast generation with multi-gateway & model fallback.
 */
export async function executeWithFallback(
  options: AIGenerateOptions,
): Promise<AIResponse> {
  const capability = options.capability ?? "general";
  const { primary } = resolveCapabilityConfig(capability);
  const gateways = getPrioritizedGateways();

  if (gateways.length === 0) {
    throw new AIError(
      "No AI API keys configured. Please add OPENROUTER_API_KEY or GROQ_API_KEY to your .env file.",
      { statusCode: 500, code: "MISSING_API_KEY" },
    );
  }

  const messages = normalizeMessages(options);
  const attemptedTargets: string[] = [];
  let lastError: unknown = null;
  let isFirstAttempt = true;

  for (const gateway of gateways) {
    for (const model of gateway.models) {
      const targetKey = `${gateway.name}:${model}`;
      if (attemptedTargets.includes(targetKey)) continue;
      attemptedTargets.push(targetKey);

      const isFallback = !isFirstAttempt;

      try {
        const response = await callChatEndpoint(model, messages, options, gateway);

        aiObservability.recordEvent({
          timestamp: new Date().toISOString(),
          requestedCapability: capability,
          requestedModel: primary,
          actualModel: response.model || model,
          provider: gateway.name,
          latencyMs: response.latencyMs,
          success: true,
          fallbackUsed: isFallback,
        });

        return {
          ...response,
          fallbackUsed: isFallback,
          attemptedModels: attemptedTargets,
        };
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError" && options.signal?.aborted) {
          throw err;
        }

        lastError = err;
        isFirstAttempt = false;

        aiObservability.recordEvent({
          timestamp: new Date().toISOString(),
          requestedCapability: capability,
          requestedModel: primary,
          actualModel: model,
          provider: gateway.name,
          latencyMs: 0,
          success: false,
          fallbackUsed: isFallback,
          errorMessage: getAIErrorMessage(err),
        });

        // If client aborted or 400 invalid input, do not churn fallbacks
        const status = (err as AIError)?.statusCode;
        if (status === 400 || status === 401 || status === 403) {
          throw err;
        }
      }
    }
  }

  throw new AIError(
    `All AI models in fallback chain failed. Last error: ${getAIErrorMessage(lastError)}`,
    { statusCode: 502, code: "ALL_FALLBACKS_EXHAUSTED", cause: lastError },
  );
}

/**
 * Execute streaming request with multi-gateway fast failover.
 */
export async function executeStreamWithFallback(
  options: AIStreamOptions,
): Promise<ReadableStream<Uint8Array>> {
  const capability = options.capability ?? "assistant";
  const { primary } = resolveCapabilityConfig(capability);
  const gateways = getPrioritizedGateways();

  if (gateways.length === 0) {
    throw new AIError(
      "No AI API keys configured. Please add OPENROUTER_API_KEY or GROQ_API_KEY to your .env file.",
      { statusCode: 500, code: "MISSING_API_KEY" },
    );
  }

  const messages = normalizeMessages(options);
  let lastError: unknown = null;
  let isFirstAttempt = true;

  for (const gateway of gateways) {
    for (const model of gateway.models) {
      const isFallback = !isFirstAttempt;

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${gateway.apiKey}`,
        };

        if (gateway.name === "OpenRouter") {
          headers["HTTP-Referer"] = "https://apiforge.dev";
          headers["X-Title"] = "APIForge";
        }

        const body: Record<string, unknown> = {
          model,
          messages,
          temperature: options.temperature ?? 0.15,
          max_tokens: options.maxOutputTokens ?? 3072,
          stream: true,
        };

        const res = await fetch(`${gateway.baseURL}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: options.signal,
        });

        if (!res.ok) {
          const errorText = await res.text();
          let errMsg = `HTTP ${res.status}`;
          try {
            const j = JSON.parse(errorText);
            if (j.error?.message) errMsg = j.error.message;
          } catch {
            if (errorText) errMsg = errorText.slice(0, 200);
          }

          if (res.status === 429) {
            throw new AIRateLimitError(errMsg, { model, provider: gateway.name });
          }
          if (res.status === 404 || res.status === 410) {
            throw new AIModelUnavailableError(errMsg, { model, provider: gateway.name });
          }
          throw new AIProviderError(errMsg, { statusCode: res.status, model, provider: gateway.name });
        }

        const reader = res.body?.getReader();
        if (!reader) throw new AIProviderError("No response body received from AI stream");

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let buffer = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith(":")) continue;
                  if (trimmed === "data: [DONE]") continue;

                  if (trimmed.startsWith("data: ")) {
                    try {
                      const data = JSON.parse(trimmed.slice(6));
                      const delta = data.choices?.[0]?.delta?.content;
                      if (delta) {
                        controller.enqueue(encoder.encode(delta));
                        if (options.onChunk) {
                          options.onChunk(delta);
                        }
                      }
                    } catch {
                      /* ignore */
                    }
                  }
                }
              }
              controller.close();
            } catch (streamErr) {
              controller.error(streamErr);
            }
          },
        });

        aiObservability.recordEvent({
          timestamp: new Date().toISOString(),
          requestedCapability: capability,
          requestedModel: primary,
          actualModel: model,
          provider: gateway.name,
          latencyMs: 0,
          success: true,
          fallbackUsed: isFallback,
        });

        return stream;
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError" && options.signal?.aborted) throw err;
        lastError = err;
        isFirstAttempt = false;

        aiObservability.recordEvent({
          timestamp: new Date().toISOString(),
          requestedCapability: capability,
          requestedModel: primary,
          actualModel: model,
          provider: gateway.name,
          latencyMs: 0,
          success: false,
          fallbackUsed: isFallback,
          errorMessage: getAIErrorMessage(err),
        });
      }
    }
  }

  throw new AIError(
    `Streaming failed across all fallback models. Last error: ${getAIErrorMessage(lastError)}`,
    { statusCode: 502, code: "ALL_STREAM_FALLBACKS_EXHAUSTED", cause: lastError },
  );
}
