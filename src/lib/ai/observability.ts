import type { AIMetrics, ObservabilityEvent } from "./types";

class AIObservabilityService {
  private events: ObservabilityEvent[] = [];
  private readonly maxEvents = 100;

  private totalRequests = 0;
  private successes = 0;
  private failures = 0;
  private fallbacksUsed = 0;
  private rateLimits = 0;
  private modelUnavailable = 0;

  public recordEvent(event: ObservabilityEvent): void {
    this.totalRequests++;
    if (event.success) {
      this.successes++;
    } else {
      this.failures++;
    }

    if (event.fallbackUsed) {
      this.fallbacksUsed++;
    }

    if (event.errorType === "RATE_LIMIT_EXCEEDED" || event.errorMessage?.includes("429")) {
      this.rateLimits++;
    }

    if (event.errorType === "MODEL_UNAVAILABLE" || event.errorMessage?.includes("not found")) {
      this.modelUnavailable++;
    }

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    // Server-side internal console log
    if (process.env.NODE_ENV !== "test") {
      const statusStr = event.success ? "SUCCESS" : "FAILURE";
      const fallbackStr = event.fallbackUsed ? ` [FALLBACK from ${event.requestedModel}]` : "";
      console.log(
        `[AI Observability] ${statusStr} | Cap: ${event.requestedCapability} | Model: ${event.actualModel}${fallbackStr} | Provider: ${event.provider} | Latency: ${event.latencyMs}ms${event.errorMessage ? ` | Error: ${event.errorMessage}` : ""}`,
      );
    }
  }

  public getMetrics(): AIMetrics {
    const fallbackRate =
      this.totalRequests > 0 ? (this.fallbacksUsed / this.totalRequests) * 100 : 0;

    return {
      totalRequests: this.totalRequests,
      successes: this.successes,
      failures: this.failures,
      fallbacksUsed: this.fallbacksUsed,
      rateLimits: this.rateLimits,
      modelUnavailable: this.modelUnavailable,
      fallbackRate: Math.round(fallbackRate * 10) / 10,
      recentEvents: [...this.events],
    };
  }

  public reset(): void {
    this.events = [];
    this.totalRequests = 0;
    this.successes = 0;
    this.failures = 0;
    this.fallbacksUsed = 0;
    this.rateLimits = 0;
    this.modelUnavailable = 0;
  }
}

export const aiObservability = new AIObservabilityService();
