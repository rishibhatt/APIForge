import type { AICapability, AICapabilityConfig, AIModelRegistry } from "./types";

/**
 * High-speed FREE model chains.
 * Groq LPU models (GPT-OSS 120B, Qwen 3.8 27B) provide sub-second (~250-600ms) latency.
 * OpenRouter free models provide secondary failover.
 */
export const DEFAULT_GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

export const DEFAULT_OPENROUTER_FREE_MODELS = [
  "inclusionai/ling-3.0-flash-vl:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openrouter/free",
];

export const DEFAULT_FREE_PRIMARY_MODEL = "openai/gpt-oss-120b";

export const DEFAULT_FREE_FALLBACK_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "inclusionai/ling-3.0-flash-vl:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openrouter/free",
];

export const AI_MODEL_REGISTRY: AIModelRegistry = {
  general: {
    primary: DEFAULT_FREE_PRIMARY_MODEL,
    fallbacks: DEFAULT_FREE_FALLBACK_MODELS,
  },
  assistant: {
    primary: DEFAULT_FREE_PRIMARY_MODEL,
    fallbacks: DEFAULT_FREE_FALLBACK_MODELS,
  },
  structured: {
    primary: DEFAULT_FREE_PRIMARY_MODEL,
    fallbacks: DEFAULT_FREE_FALLBACK_MODELS,
  },
  code: {
    primary: DEFAULT_FREE_PRIMARY_MODEL,
    fallbacks: DEFAULT_FREE_FALLBACK_MODELS,
  },
};

/**
 * Resolves the configuration for a given capability, taking into account
 * runtime environment variables with backward-compatibility fallbacks.
 */
export function resolveCapabilityConfig(
  capability: AICapability = "general",
): AICapabilityConfig {
  const baseConfig = AI_MODEL_REGISTRY[capability] || AI_MODEL_REGISTRY.general;

  let primary = process.env.AI_MODEL_PRIMARY?.trim();
  if (!primary) {
    const legacy = process.env.GROQ_MODEL?.trim();
    if (legacy && legacy !== "llama-3.3-70b-versatile" && legacy !== "qwen/qwen3.6-27b") {
      primary = legacy;
    } else {
      primary = baseConfig.primary;
    }
  }

  let fallbacks: string[] = [];
  const customFallbacks = process.env.AI_MODEL_FALLBACKS?.trim();
  if (customFallbacks) {
    fallbacks = customFallbacks
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    const legacyFallback = process.env.GROQ_MODEL_FALLBACK?.trim();
    if (legacyFallback && legacyFallback !== primary) {
      fallbacks = [legacyFallback, ...baseConfig.fallbacks.filter((f) => f !== legacyFallback)];
    } else {
      fallbacks = [...baseConfig.fallbacks];
    }
  }

  const uniqueFallbacks = fallbacks.filter((f) => f !== primary);

  return {
    primary,
    fallbacks: uniqueFallbacks,
  };
}

export function getModelChain(capability: AICapability = "general"): string[] {
  const { primary, fallbacks } = resolveCapabilityConfig(capability);
  return [primary, ...fallbacks];
}

export interface GatewayEndpoint {
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
}

/**
 * Returns prioritized gateways based on configured environment variables.
 * If Groq key is present, Groq LPU endpoints are tried first for ultra-low latency (250-600ms).
 * OpenRouter is used as multi-model / multi-provider gateway & failover.
 */
export function getPrioritizedGateways(): GatewayEndpoint[] {
  const gateways: GatewayEndpoint[] = [];
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const customBaseUrl = process.env.AI_GATEWAY_BASE_URL?.trim();

  // 1. High-Speed Groq Gateway (sub-second LPU inference)
  if (groqKey) {
    gateways.push({
      name: "Groq LPU",
      baseURL: customBaseUrl || "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      models: DEFAULT_GROQ_MODELS,
    });
  }

  // 2. OpenRouter Gateway (fallback / multi-model router)
  if (openRouterKey) {
    gateways.push({
      name: "OpenRouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
      models: DEFAULT_OPENROUTER_FREE_MODELS,
    });
  }

  return gateways;
}
