import {
  getAIErrorMessage,
  isAIModelUnavailableError,
  isAIRateLimitError,
} from "./ai/errors";

/** Pull a human-readable message from AI errors (backward compatible). */
export function groqErrorMessage(error: unknown): string {
  return getAIErrorMessage(error);
}

export function isGroqRateLimitError(error: unknown): boolean {
  return isAIRateLimitError(error);
}

export function isGroqModelUnavailableError(error: unknown): boolean {
  return isAIModelUnavailableError(error);
}
