import { NextRequest } from "next/server";
import type { ApiExecutionRequest } from "@/types/execution";
import { executeProxyRequest } from "@/lib/proxy-execution";
import {
  acquireConcurrencySlot,
  checkRateLimitAndConcurrency,
  releaseConcurrencySlot,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: ApiExecutionRequest;
  try {
    body = (await req.json()) as ApiExecutionRequest;
  } catch {
    return Response.json(
      {
        success: false,
        executionMode: "apiforge-proxy",
        requestId: `req_err_${Date.now()}`,
        error: {
          code: "INVALID_URL",
          message: "Invalid JSON request payload.",
        },
      },
      { status: 400 },
    );
  }

  // Rate Limiting & Concurrency Check
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const rateCheck = checkRateLimitAndConcurrency(clientIp);

  if (!rateCheck.allowed) {
    return Response.json(
      {
        success: false,
        executionMode: "apiforge-proxy",
        requestId: `req_limit_${Date.now()}`,
        error: {
          code: rateCheck.reason || "RATE_LIMITED",
          message: rateCheck.message || "Rate limit exceeded.",
        },
      },
      { status: 429 },
    );
  }

  acquireConcurrencySlot(clientIp);
  try {
    const result = await executeProxyRequest(body, clientIp);
    const httpStatus = result.success ? 200 : result.status || 400;
    return Response.json(result, { status: httpStatus });
  } catch (err) {
    return Response.json(
      {
        success: false,
        executionMode: "apiforge-proxy",
        requestId: `req_err_${Date.now()}`,
        error: {
          code: "UNKNOWN",
          message:
            err instanceof Error
              ? err.message
              : "An unexpected proxy execution error occurred.",
        },
      },
      { status: 500 },
    );
  } finally {
    releaseConcurrencySlot(clientIp);
  }
}
