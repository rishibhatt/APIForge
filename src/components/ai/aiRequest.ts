import { toast } from "@/components/providers/Toaster/toast";
import { getAiUsageNow, reportAiHeaders, reportAiUsageSnapshot } from "@/hooks/useAiUsage";
import { SUPPORT_PATH, type AiErrorBody } from "@/lib/ai/usage-types";

export type AiFailureKind =
  | "rate_limit"
  | "off_topic"
  | "busy"
  | "bad_input"
  | "network"
  | "unknown";

/** Thrown after the toast was already shown, so callers can skip a second message. */
export class AiRequestError extends Error {
  readonly kind: AiFailureKind;
  readonly handled = true;
  constructor(kind: AiFailureKind, message: string) {
    super(message);
    this.name = "AiRequestError";
    this.kind = kind;
  }
}

export interface AiFailureOptions {
  /** Shown as the Retry action on the "busy" and network toasts. */
  onRetry?: () => void;
}

function safeMessage(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const text = raw.trim();
  if (!text || text.length > 220) return fallback;
  if (/\n\s+at\s|^[{[]|<\/?[a-z][\s\S]*>|HTTP \d{3}/i.test(text)) return fallback;
  return text;
}

async function readBody(res: Response): Promise<Partial<AiErrorBody> | null> {
  try {
    const j = (await res.json()) as unknown;
    return j && typeof j === "object" ? (j as Partial<AiErrorBody>) : null;
  } catch {
    return null;
  }
}

/**
 * Turn a non-OK AI response into a toast and a typed error. Always updates the usage numbers
 * from the headers (and the 429 body) first.
 */
export async function handleAiErrorResponse(
  res: Response,
  opts: AiFailureOptions = {},
): Promise<AiRequestError> {
  reportAiHeaders(res.headers);
  const body = await readBody(res);
  if (body?.usage) reportAiUsageSnapshot(body.usage);
  const code = body?.code;

  if (code === "AI_RATE_LIMIT" && body?.usage && body.usage.remaining > 0) {
    // Per-minute burst guard, not the 5-hour quota.
    toast.warning("Slow down a little", {
      description: "Too many requests in a short time. Wait a few seconds and try again.",
      action: opts.onRetry ? { label: "Retry", onClick: opts.onRetry } : undefined,
      id: "ai-burst",
    });
    return new AiRequestError("busy", "Too many requests. Wait a few seconds.");
  }

  if (code === "AI_RATE_LIMIT") {
    const u = getAiUsageNow();
    toast.error("AI limit reached", {
      description: u.resetIn
        ? `You used all ${u.limit} requests for now. Resets in ${u.resetIn}.`
        : `You used all ${u.limit} requests for now.`,
      action: { label: "Why the limit?", href: SUPPORT_PATH },
      id: "ai-limit",
    });
    return new AiRequestError("rate_limit", "AI limit reached");
  }

  if (code === "AI_OFF_TOPIC" || res.status === 422) {
    const message = safeMessage(
      body?.error,
      "The assistant only answers questions about APIs, OpenAPI, and the loaded operation.",
    );
    toast.info(message, { id: "ai-off-topic" });
    return new AiRequestError("off_topic", message);
  }

  if (code === "AI_BAD_INPUT" || res.status === 400 || res.status === 413) {
    const message = safeMessage(body?.error, "That request was too long or malformed. Shorten it and try again.");
    toast.error("Request not sent", { description: message, id: "ai-bad-input" });
    return new AiRequestError("bad_input", message);
  }

  if (code === "AI_UPSTREAM_BUSY" || res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) {
    toast.warning("The free model is busy. Try again in a minute.", {
      action: opts.onRetry ? { label: "Retry", onClick: opts.onRetry } : undefined,
      id: "ai-busy",
    });
    return new AiRequestError("busy", "The free model is busy. Try again in a minute.");
  }

  toast.error("The AI request failed", {
    description: safeMessage(body?.error, "Something went wrong on our side. Try again."),
    action: opts.onRetry ? { label: "Retry", onClick: opts.onRetry } : undefined,
    id: "ai-failed",
  });
  return new AiRequestError("unknown", "The AI request failed");
}

/** Fetch rejected (offline, DNS, CORS, dropped stream). Aborts are not errors: check before calling. */
export function handleAiNetworkError(opts: AiFailureOptions = {}): AiRequestError {
  toast.error("Can't reach the server", {
    description: "Check your connection and try again.",
    action: opts.onRetry ? { label: "Retry", onClick: opts.onRetry } : undefined,
    id: "ai-network",
  });
  return new AiRequestError("network", "Can't reach the server");
}

export function isAbortError(e: unknown): boolean {
  return (e as { name?: string } | null)?.name === "AbortError";
}

/** Handle any thrown value from an AI fetch flow. Returns the error that should be shown inline. */
export function handleAiThrown(e: unknown, opts: AiFailureOptions = {}): AiRequestError {
  if (e instanceof AiRequestError) return e;
  return handleAiNetworkError(opts);
}
