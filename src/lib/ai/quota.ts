import {
  AI_HEADER_LIMIT,
  AI_HEADER_REMAINING,
  AI_HEADER_RESET,
  AI_REQUEST_LIMIT,
  AI_WINDOW_MS,
  SUPPORT_PATH,
  type AiErrorBody,
  type AiErrorCode,
  type AiUsageSnapshot,
} from "./usage-types";
import { getAIErrorMessage, isAIRateLimitError } from "./errors";
import {
  consumeRateLimit,
  consumeWindowLimit,
  getClientIp,
  peekWindowLimit,
} from "@/lib/security/rate-limit";

/** One bucket per visitor, shared by every AI route (and the usage endpoint). */
export function aiQuotaKey(req: Request): string {
  return `ai-quota:${getClientIp(req)}`;
}

function toSnapshot(r: AiUsageSnapshot): AiUsageSnapshot {
  return { limit: r.limit, remaining: r.remaining, resetAt: r.resetAt, windowMs: r.windowMs };
}

/** Current usage for the caller without consuming anything. */
export function peekAiUsage(req: Request): AiUsageSnapshot {
  return toSnapshot(peekWindowLimit(aiQuotaKey(req), AI_REQUEST_LIMIT, AI_WINDOW_MS));
}

/** Sets x-ai-limit / x-ai-remaining / x-ai-reset (reset is omitted when nothing is counted). */
export function applyAiUsageHeaders(headers: Headers, usage: AiUsageSnapshot): Headers {
  headers.set(AI_HEADER_LIMIT, String(usage.limit));
  headers.set(AI_HEADER_REMAINING, String(usage.remaining));
  if (usage.resetAt != null) headers.set(AI_HEADER_RESET, String(usage.resetAt));
  else headers.delete(AI_HEADER_RESET);
  return headers;
}

function formatResetTime(resetAt: number | null, now: number): string {
  if (resetAt == null) return "shortly";
  const mins = Math.max(1, Math.ceil((resetAt - now) / 60_000));
  const at = new Date(resetAt).toISOString().slice(11, 16);
  const rel =
    mins >= 90 ? `${Math.round(mins / 60)} hours` : mins === 1 ? "1 minute" : `${mins} minutes`;
  return `${at} UTC (in about ${rel})`;
}

export function quotaExhaustedMessage(usage: AiUsageSnapshot, now: number = Date.now()): string {
  return `You have used all ${usage.limit} AI requests for this 5-hour window. A slot frees up at ${formatResetTime(usage.resetAt, now)}. These tools run on free models, so each visitor gets ${AI_REQUEST_LIMIT} requests per 5 hours. See ${SUPPORT_PATH}.`;
}

/** JSON error response with the usage headers attached (peek unless `usage` is supplied). */
export function aiErrorResponse(
  req: Request,
  status: number,
  error: string,
  code?: AiErrorCode,
  usage?: AiUsageSnapshot,
  includeUsageInBody = false,
): Response {
  const snap = usage ?? peekAiUsage(req);
  const body: AiErrorBody | { error: string } = code
    ? { error, code, ...(includeUsageInBody ? { usage: snap } : {}) }
    : { error };
  const headers = applyAiUsageHeaders(
    new Headers({ "Cache-Control": "no-store" }),
    snap,
  );
  return Response.json(body, { status, headers });
}

/** Per-minute burst guard (existing limiter). Returns a 429 Response or null. */
export function aiBurstGuard(req: Request): Response | null {
  const limited = consumeRateLimit(`ai:${getClientIp(req)}`);
  if (limited.allowed) return null;
  return aiErrorResponse(
    req,
    429,
    limited.message ?? "Too many requests. Slow down and try again in a minute.",
    "AI_RATE_LIMIT",
    undefined,
    true,
  );
}

export type AiQuotaGate =
  | { ok: true; usage: AiUsageSnapshot }
  | { ok: false; response: Response };

/**
 * Counts one request against the visitor's 40 / 5h quota. Call it only AFTER the request passed
 * validation and the off-topic check, and BEFORE the model call.
 */
export function consumeAiQuota(req: Request): AiQuotaGate {
  const now = Date.now();
  const r = consumeWindowLimit(aiQuotaKey(req), AI_REQUEST_LIMIT, AI_WINDOW_MS, now);
  const usage = toSnapshot(r);
  if (r.allowed) return { ok: true, usage };
  return {
    ok: false,
    response: aiErrorResponse(
      req,
      429,
      quotaExhaustedMessage(usage, now),
      "AI_RATE_LIMIT",
      usage,
      true,
    ),
  };
}

/** Maps an upstream model failure to a response (quota stays consumed; usage headers attached). */
export function aiUpstreamErrorResponse(
  req: Request,
  e: unknown,
  usage: AiUsageSnapshot,
  opts?: { fallbackStatus?: number; hint?: string },
): Response {
  const rateLimited = isAIRateLimitError(e);
  const status = rateLimited ? 429 : (opts?.fallbackStatus ?? 502);
  const msg = `${getAIErrorMessage(e)}${opts?.hint ?? ""}`;
  const code: AiErrorCode | undefined =
    rateLimited || status === 502 ? "AI_UPSTREAM_BUSY" : undefined;
  return aiErrorResponse(req, status, msg, code, usage);
}
