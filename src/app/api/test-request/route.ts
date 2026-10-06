import { NextRequest } from "next/server";
import type { ApiExecutionRequest } from "@/types/execution";
import { executeProxyRequest } from "@/lib/proxy-execution";
import {
  acquireConcurrencySlot,
  checkRateLimitAndConcurrency,
  getClientIp,
  releaseConcurrencySlot,
} from "@/lib/security/rate-limit";
import { readJsonObject } from "@/lib/http/read-json-body";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Proxy body cap is 2MB; allow headroom for headers/query/auth in the envelope.
  const parsedBody = await readJsonObject(req, 3 * 1024 * 1024);
  if (!parsedBody.ok) {
    return Response.json(
      {
        success: false,
        executionMode: "apiforge-proxy",
        requestId: `req_err_${Date.now()}`,
        error: {
          code: parsedBody.status === 413 ? "REQUEST_TOO_LARGE" : "INVALID_URL",
          message:
            parsedBody.status === 413
              ? "Request payload too large."
              : "Invalid JSON request payload.",
        },
      },
      { status: parsedBody.status },
    );
  }
  const body = parsedBody.body as unknown as ApiExecutionRequest;

  // Rate Limiting & Concurrency Check
  const clientIp = getClientIp(req);
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
    console.error("[test-request] unexpected proxy error:", err);
    return Response.json(
      {
        success: false,
        executionMode: "apiforge-proxy",
        requestId: `req_err_${Date.now()}`,
        error: {
          code: "UNKNOWN",
          message: "An unexpected proxy execution error occurred.",
        },
      },
      { status: 500 },
    );
  } finally {
    releaseConcurrencySlot(clientIp);
  }
}
