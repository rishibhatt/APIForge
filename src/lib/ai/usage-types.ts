/**
 * Shared contract between the AI API routes (server) and the UI (client) for AI usage limits.
 * Plain constants and types only: safe to import from both sides.
 */

/** Requests allowed per visitor (IP) per rolling window, across ALL AI tools. */
export const AI_REQUEST_LIMIT = 40;
/** Rolling window: 5 hours. */
export const AI_WINDOW_MS = 5 * 60 * 60 * 1000;

/** Response headers set on every AI route response (success and error). */
export const AI_HEADER_LIMIT = "x-ai-limit";
export const AI_HEADER_REMAINING = "x-ai-remaining";
/** Epoch ms when the oldest counted request leaves the window (when one more request frees up). */
export const AI_HEADER_RESET = "x-ai-reset";

export interface AiUsageSnapshot {
  limit: number;
  remaining: number;
  /** Epoch ms when a request slot frees up; null when nothing is counted yet. */
  resetAt: number | null;
  windowMs: number;
}

export type AiErrorCode =
  /** 429: the visitor used all requests in the window. Body includes `usage`. */
  | "AI_RATE_LIMIT"
  /** 429/502: the upstream free model is busy or rate limited (not the visitor's quota). */
  | "AI_UPSTREAM_BUSY"
  /** 422: the request is not about APIs, OpenAPI, or the loaded operation. */
  | "AI_OFF_TOPIC"
  /** 400: malformed or oversized input. */
  | "AI_BAD_INPUT";

export interface AiErrorBody {
  error: string;
  code: AiErrorCode;
  usage?: AiUsageSnapshot;
}

/** Where visitors go to learn about the limits and support the project. */
export const SUPPORT_PATH = "/support";
