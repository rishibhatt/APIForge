import "server-only";
import type {
  ApiExecutionRequest,
  ApiExecutionResult,
  TestExecutionErrorCode,
} from "@/types/execution";
import {
  containsControlCharacters,
  normalizeAndValidateMethod,
  resolveAndValidateDestination,
} from "./security/url-validation";
import {
  redactSensitiveHeaders,
  sanitizeRequestHeaders,
} from "./security/header-sanitization";
import { generateRequestId, logSsrfSecurityEvent } from "./security/ssrf-logger";

const MAX_URL_BYTES = 8 * 1024; // 8 KB
const MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_REDIRECT_COUNT = 3;

export async function executeProxyRequest(
  reqDef: ApiExecutionRequest,
  clientId = "anonymous",
): Promise<ApiExecutionResult> {
  const requestId = generateRequestId();
  const t0 = performance.now();

  // 1. Input Validation — Method & URL length
  if (!reqDef.url || typeof reqDef.url !== "string") {
    return makeErrorResult("INVALID_URL", "Target URL is required.", requestId);
  }

  if (Buffer.byteLength(reqDef.url, "utf-8") > MAX_URL_BYTES) {
    return makeErrorResult(
      "REQUEST_TOO_LARGE",
      "URL exceeds maximum allowed length of 8KB.",
      requestId,
    );
  }

  const methodCheck = normalizeAndValidateMethod(reqDef.method || "GET");
  if (!methodCheck.valid) {
    return makeErrorResult(
      "UNSUPPORTED_PROTOCOL",
      `HTTP method "${reqDef.method}" is not supported or prohibited.`,
      requestId,
    );
  }
  const method = methodCheck.method;

  // 2. Timeout Cap
  let timeoutMs = reqDef.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (typeof timeoutMs !== "number" || isNaN(timeoutMs) || timeoutMs <= 0) {
    timeoutMs = DEFAULT_TIMEOUT_MS;
  }
  if (timeoutMs > MAX_TIMEOUT_MS) {
    timeoutMs = MAX_TIMEOUT_MS;
  }

  // 3. Request Body Size Limit
  let requestBodyData: string | undefined;
  if (reqDef.body !== undefined && reqDef.body !== null) {
    requestBodyData =
      typeof reqDef.body === "string"
        ? reqDef.body
        : JSON.stringify(reqDef.body);

    if (Buffer.byteLength(requestBodyData, "utf-8") > MAX_REQUEST_BODY_BYTES) {
      return makeErrorResult(
        "REQUEST_TOO_LARGE",
        "Request body exceeds 2MB limit.",
        requestId,
      );
    }
  }

  // 4. Initial Destination Security Validation (SSRF guard)
  const currentUrl = reqDef.url;
  const targetValidation = await resolveAndValidateDestination(currentUrl);

  if (!targetValidation.allowed || !targetValidation.url) {
    const errCode = mapReasonToErrorCode(targetValidation.reason);
    logSsrfSecurityEvent({
      requestId,
      userId: clientId,
      targetHostname: targetValidation.url?.hostname || "unknown",
      targetPort: targetValidation.url
        ? parseInt(targetValidation.url.port || (targetValidation.url.protocol === "https:" ? "443" : "80"), 10)
        : 80,
      executionMode: "apiforge-proxy",
      action: "BLOCKED",
      blockedReason: targetValidation.message || targetValidation.reason,
      timestamp: new Date().toISOString(),
    });
    return makeErrorResult(errCode, targetValidation.message || "Destination blocked.", requestId);
  }

  // Log allowed target
  logSsrfSecurityEvent({
    requestId,
    userId: clientId,
    targetHostname: targetValidation.url.hostname,
    targetPort: parseInt(targetValidation.url.port || (targetValidation.url.protocol === "https:" ? "443" : "80"), 10),
    executionMode: "apiforge-proxy",
    action: "ALLOWED",
    timestamp: new Date().toISOString(),
  });

  // 5. Build Headers and Apply Auth
  const headerSanitization = sanitizeRequestHeaders(reqDef.headers);
  if (!headerSanitization.valid) {
    return makeErrorResult(
      "INVALID_URL",
      headerSanitization.error || "Invalid headers.",
      requestId,
    );
  }

  const outboundHeaders = new Headers(headerSanitization.cleanHeaders);

  // Apply Auth if provided
  if (reqDef.auth && reqDef.auth.type !== "none") {
    const { type, bearerToken, apiKeyName, apiKeyValue, apiKeyIn, basicUser, basicPass } = reqDef.auth;
    const hasAuthHeader = outboundHeaders.has("Authorization");

    if (type === "bearer" && bearerToken?.trim() && !hasAuthHeader) {
      outboundHeaders.set("Authorization", `Bearer ${bearerToken.trim()}`);
    } else if (type === "basic" && (basicUser || basicPass) && !hasAuthHeader) {
      const raw = `${basicUser ?? ""}:${basicPass ?? ""}`;
      const token = Buffer.from(raw, "utf-8").toString("base64");
      outboundHeaders.set("Authorization", `Basic ${token}`);
    } else if (type === "apiKey" && apiKeyName?.trim() && apiKeyValue?.trim()) {
      const ak = apiKeyName.trim();
      const av = apiKeyValue.trim();
      if (apiKeyIn === "query") {
        targetValidation.url.searchParams.set(ak, av);
      } else if (!outboundHeaders.has(ak)) {
        outboundHeaders.set(ak, av);
      }
    }
  }

  // Apply Query Params if provided
  if (reqDef.queryParams) {
    for (const [k, v] of Object.entries(reqDef.queryParams)) {
      if (v !== undefined && v !== null && !containsControlCharacters(k) && !containsControlCharacters(v)) {
        targetValidation.url.searchParams.set(k, v);
      }
    }
  }

  // Set default Content-Type if body present
  if (requestBodyData && !outboundHeaders.has("Content-Type") && !outboundHeaders.has("content-type")) {
    outboundHeaders.set("Content-Type", "application/json");
  }

  // 6. Manual Redirect Execution Loop
  let redirectCount = 0;
  let activeUrl = targetValidation.url;
  const initialOrigin = activeUrl.origin;

  while (redirectCount <= MAX_REDIRECT_COUNT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Execute Outbound Fetch
      const res = await fetch(activeUrl.toString(), {
        method,
        headers: outboundHeaders,
        body: requestBodyData,
        redirect: "manual",
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Handle Redirects manually
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location");
        if (!location) {
          return makeErrorResult(
            "REDIRECT_BLOCKED",
            "Redirect response missing Location header.",
            requestId,
          );
        }

        redirectCount += 1;
        if (redirectCount > MAX_REDIRECT_COUNT) {
          return makeErrorResult(
            "REDIRECT_BLOCKED",
            `Maximum redirect limit of ${MAX_REDIRECT_COUNT} exceeded.`,
            requestId,
          );
        }

        let nextUrl: URL;
        try {
          nextUrl = new URL(location, activeUrl);
        } catch {
          return makeErrorResult(
            "INVALID_URL",
            `Invalid redirect location URL "${location}".`,
            requestId,
          );
        }

        // Re-validate redirect target URL and IP (SSRF Layer 7 guard)
        const redirectCheck = await resolveAndValidateDestination(nextUrl.toString());
        if (!redirectCheck.allowed || !redirectCheck.url) {
          logSsrfSecurityEvent({
            requestId,
            userId: clientId,
            targetHostname: nextUrl.hostname,
            targetPort: parseInt(nextUrl.port || (nextUrl.protocol === "https:" ? "443" : "80"), 10),
            executionMode: "apiforge-proxy",
            action: "BLOCKED",
            blockedReason: `Redirect destination blocked: ${redirectCheck.message || redirectCheck.reason}`,
            timestamp: new Date().toISOString(),
          });
          return makeErrorResult(
            mapReasonToErrorCode(redirectCheck.reason),
            `Redirect destination blocked: ${redirectCheck.message || "Security violation"}`,
            requestId,
          );
        }

        // Strip credentials if redirecting to a different origin
        if (nextUrl.origin !== initialOrigin) {
          outboundHeaders.delete("Authorization");
          outboundHeaders.delete("X-API-Key");
          outboundHeaders.delete("Api-Key");
        }

        activeUrl = redirectCheck.url;
        continue; // Loop to execute redirect
      }

      // 7. Enforce Response Size Limit (Layer 10)
      const durationMs = Math.round(performance.now() - t0);
      let responseBodyBuffer: Buffer;

      if (res.body) {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.byteLength;
            if (totalBytes > MAX_RESPONSE_BYTES) {
              await reader.cancel();
              return makeErrorResult(
                "RESPONSE_TOO_LARGE",
                `Response size exceeded maximum allowed limit of ${MAX_RESPONSE_BYTES / (1024 * 1024)}MB.`,
                requestId,
              );
            }
            chunks.push(value);
          }
        }
        responseBodyBuffer = Buffer.concat(chunks);
      } else {
        responseBodyBuffer = Buffer.from([]);
      }

      const rawText = responseBodyBuffer.toString("utf-8");
      let parsedBody: unknown = null;
      try {
        parsedBody = rawText ? JSON.parse(rawText) : null;
      } catch {
        parsedBody = null;
      }

      // Collect normalized headers
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const redactedHeaders = redactSensitiveHeaders(responseHeaders);

      return {
        success: true,
        executionMode: "apiforge-proxy",
        status: res.status,
        statusText: res.statusText,
        headers: redactedHeaders,
        body: parsedBody !== null ? parsedBody : rawText,
        rawBody: rawText,
        contentType: res.headers.get("content-type") || undefined,
        durationMs,
        responseSizeBytes: responseBodyBuffer.byteLength,
        redirectCount,
        requestId,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        return makeErrorResult(
          "REQUEST_TIMEOUT",
          `Request timed out after ${timeoutMs / 1000} seconds.`,
          requestId,
        );
      }
      return makeErrorResult(
        "TARGET_UNREACHABLE",
        err instanceof Error ? err.message : "Failed to connect to target API.",
        requestId,
      );
    }
  }

  return makeErrorResult("REDIRECT_BLOCKED", "Too many redirects.", requestId);
}

function mapReasonToErrorCode(reason?: string): TestExecutionErrorCode {
  switch (reason) {
    case "LOOPBACK":
      return "LOOPBACK_BLOCKED";
    case "PRIVATE_NETWORK":
      return "PRIVATE_NETWORK_BLOCKED";
    case "METADATA_ENDPOINT":
      return "METADATA_ENDPOINT_BLOCKED";
    case "PORT_BLOCKED":
      return "PORT_BLOCKED";
    case "UNSUPPORTED_PROTOCOL":
      return "UNSUPPORTED_PROTOCOL";
    case "DNS_RESOLUTION_FAILED":
      return "DNS_RESOLUTION_FAILED";
    default:
      return "INVALID_URL";
  }
}

function makeErrorResult(
  code: TestExecutionErrorCode,
  message: string,
  requestId: string,
): ApiExecutionResult {
  return {
    success: false,
    executionMode: "apiforge-proxy",
    requestId,
    error: {
      code,
      message,
      retryable: code === "REQUEST_TIMEOUT" || code === "TARGET_UNREACHABLE",
    },
  };
}
