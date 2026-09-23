export type AICapability = "general" | "assistant" | "structured" | "code";

export interface AITokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIModelDefinition {
  id: string;
  name: string;
  isFree: boolean;
  contextLength?: number;
  supportsStreaming?: boolean;
  supportsTools?: boolean;
}

export interface AICapabilityConfig {
  primary: string;
  fallbacks: string[];
}

export interface AIModelRegistry {
  general: AICapabilityConfig;
  assistant: AICapabilityConfig;
  structured: AICapabilityConfig;
  code: AICapabilityConfig;
}

export interface AIGenerateOptions {
  capability?: AICapability;
  prompt: string;
  system?: string;
  messages?: AIMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}

export interface AIResponse {
  text: string;
  model: string;
  provider?: string;
  usage?: AITokenUsage;
  latencyMs: number;
  fallbackUsed: boolean;
  attemptedModels?: string[];
}

export interface AIStreamOptions extends AIGenerateOptions {
  onChunk?: (delta: string) => void;
}

export interface ObservabilityEvent {
  timestamp: string;
  requestedCapability: AICapability;
  requestedModel: string;
  actualModel: string;
  provider: string;
  latencyMs: number;
  success: boolean;
  fallbackUsed: boolean;
  fallbackLevel?: number;
  errorType?: string;
  errorMessage?: string;
}

export interface AIMetrics {
  totalRequests: number;
  successes: number;
  failures: number;
  fallbacksUsed: number;
  rateLimits: number;
  modelUnavailable: number;
  fallbackRate: number;
  recentEvents: ObservabilityEvent[];
}
