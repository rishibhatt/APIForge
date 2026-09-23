export class AIError extends Error {
  public statusCode?: number;
  public code?: string;
  public model?: string;
  public provider?: string;
  public retryable: boolean;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      code?: string;
      model?: string;
      provider?: string;
      retryable?: boolean;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "AIError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
    this.model = options?.model;
    this.provider = options?.provider;
    this.retryable = options?.retryable ?? false;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

export class AIRateLimitError extends AIError {
  constructor(message: string, options?: { model?: string; provider?: string; cause?: unknown }) {
    super(message, {
      statusCode: 429,
      code: "RATE_LIMIT_EXCEEDED",
      retryable: true,
      ...options,
    });
    this.name = "AIRateLimitError";
  }
}

export class AIModelUnavailableError extends AIError {
  constructor(message: string, options?: { model?: string; provider?: string; cause?: unknown }) {
    super(message, {
      statusCode: 404,
      code: "MODEL_UNAVAILABLE",
      retryable: true,
      ...options,
    });
    this.name = "AIModelUnavailableError";
  }
}

export class AIProviderError extends AIError {
  constructor(message: string, options?: { statusCode?: number; model?: string; provider?: string; cause?: unknown }) {
    super(message, {
      statusCode: options?.statusCode ?? 502,
      code: "PROVIDER_ERROR",
      retryable: true,
      ...options,
    });
    this.name = "AIProviderError";
  }
}

export class AIValidationError extends AIError {
  constructor(message: string, options?: { model?: string; cause?: unknown }) {
    super(message, {
      statusCode: 422,
      code: "VALIDATION_FAILED",
      retryable: false,
      ...options,
    });
    this.name = "AIValidationError";
  }
}

/**
 * Extracts a clean, human-readable message from any error or API response body.
 */
export function getAIErrorMessage(error: unknown): string {
  if (error == null) return "AI generation failed";
  if (typeof error === "string") return error;
  if (error instanceof AIError) return error.message;

  if (error instanceof Error) {
    const errWithBody = error as Error & {
      statusCode?: number;
      responseBody?: string;
      cause?: unknown;
    };

    if (typeof errWithBody.responseBody === "string" && errWithBody.responseBody.length > 0) {
      try {
        const j = JSON.parse(errWithBody.responseBody) as {
          error?: { message?: string; code?: string };
        };
        const m = j.error?.message;
        if (typeof m === "string" && m.length > 0) return m;
      } catch {
        /* ignore */
      }
    }

    if (errWithBody.cause) {
      const inner = getAIErrorMessage(errWithBody.cause);
      if (inner && inner !== "AI generation failed") return inner;
    }

    return error.message || "AI generation failed";
  }

  if (typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }

  return "AI generation failed";
}

/**
 * Checks whether an error is a 429 or rate limit error.
 */
export function isAIRateLimitError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  if (error instanceof AIRateLimitError) return true;

  const o = error as { statusCode?: number; status?: number; cause?: unknown };
  if (o.statusCode === 429 || o.status === 429) return true;

  const msg = getAIErrorMessage(error).toLowerCase();
  if (
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("tokens per minute") ||
    msg.includes("tpm") ||
    msg.includes("429") ||
    msg.includes("quota exceeded")
  ) {
    return true;
  }

  if (o.cause) return isAIRateLimitError(o.cause);
  return false;
}

/**
 * Checks whether an error indicates a model is decommissioned, not found, or unavailable.
 */
export function isAIModelUnavailableError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  if (error instanceof AIModelUnavailableError) return true;

  const o = error as { statusCode?: number; status?: number; cause?: unknown };
  if (o.statusCode === 404 || o.status === 404 || o.statusCode === 410 || o.status === 410) {
    return true;
  }

  const msg = getAIErrorMessage(error).toLowerCase();
  if (
    msg.includes("not found") ||
    msg.includes("decommissioned") ||
    msg.includes("no longer available") ||
    msg.includes("unknown model") ||
    msg.includes("does not exist") ||
    msg.includes("unsupported model") ||
    msg.includes("model_not_found")
  ) {
    return true;
  }

  if (o.cause) return isAIModelUnavailableError(o.cause);
  return false;
}
