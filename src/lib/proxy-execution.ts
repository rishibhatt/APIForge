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
import type { IpValidationOptions } from "./security/ip-validation";
import {
  redactSensitiveHeaders,
  sanitizeRequestHeaders,
} from "./security/header-sanitization";
import { generateRequestId, logSsrfSecurityEvent } from "./security/ssrf-logger";
import {
  applyBodyContentType,
  applyQueryParams,
  buildRequestBody,
  RequestBodyError,
  type BuiltBody,
  type RequestFile,
} from "./http/request-body";
import {
  bytesToBase64,
  isTextContentType,
  readResponseBytes,
  STREAM_WINDOW_MS,
} from "./http/response-body";

const MAX_URL_BYTES = 8 * 1024; // 8 KB
export const MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
/**
 * Binary responses travel base64-encoded (+33%) inside the JSON envelope, and Netlify Functions
 * cap a response at 6MB. 4MB of bytes stays under that.
 */
const MAX_BINARY_RESPONSE_BYTES = 4 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_REDIRECT_COUNT = 3;

export function getProxySecurityOptions(): IpValidationOptions {
  const strictMode =
    process.env.STRICT_SSRF === "true" ||
    process.env.APIFORGE_STRICT_SSRF === "true";

  if (strictMode) {
    return {
      allowLoopback: false,
      allowPrivateNetworks: false,
    };
  }

  return {
    allowLoopback: true,
    allowPrivateNetworks: true,
  };
}

export async function executeProxyRequest(
  reqDef: ApiExecutionRequest,
  clientId = "anonymous",
  /** Files from the multipart envelope, referenced by `formParts[].fileIndex` / `binaryFileIndex`. */
  files: RequestFile[] = [],
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
  let method = methodCheck.method;

  // 2. Timeout Cap
  let timeoutMs = reqDef.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (typeof timeoutMs !== "number" || isNaN(timeoutMs) || timeoutMs <= 0) {
    timeoutMs = DEFAULT_TIMEOUT_MS;
  }
  if (timeoutMs > MAX_TIMEOUT_MS) {
    timeoutMs = MAX_TIMEOUT_MS;
  }

  // 3. Request Body (JSON, text, urlencoded, multipart or raw file) and Size Limit
  let built: BuiltBody;
  try {
    built = buildRequestBody(reqDef, files);
  } catch (e) {
    return makeErrorResult(
      "INVALID_URL",
      e instanceof RequestBodyError ? e.message : "Could not build the request body.",
      requestId,
    );
  }
  if (built.size > MAX_REQUEST_BODY_BYTES) {
    return makeErrorResult(
      "REQUEST_TOO_LARGE",
      `Request body exceeds the ${MAX_REQUEST_BODY_BYTES / (1024 * 1024)}MB proxy limit. Use Browser mode for larger uploads.`,
      requestId,
    );
  }
  let requestBodyData: BodyInit | undefined = built.body;

  // 4. Initial Destination Security Validation (SSRF guard)
  const currentUrl = reqDef.url;
  const securityOptions = getProxySecurityOptions();
  const targetValidation = await resolveAndValidateDestination(currentUrl, securityOptions);

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
  // Header names that carry credentials and must not follow a cross-origin redirect.
  const credentialHeaderNames = new Set(["authorization", "x-api-key", "api-key"]);

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
        credentialHeaderNames.add(ak.toLowerCase());
      }
    }
  }

  // Apply Query Params if provided (array values become repeated keys)
  applyQueryParams(
    targetValidation.url,
    reqDef.queryParams,
    (k, v) => containsControlCharacters(k) || containsControlCharacters(v),
  );

  // Content-Type follows the body: JSON default, urlencoded, file type, or removed for multipart (boundary).
  applyBodyContentType(outboundHeaders, built);

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

      // Timer stays armed until the body is fully read (cleared in `finally`), so a target
      // that sends headers and then trickles the body cannot hold the request open.

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
        const redirectCheck = await resolveAndValidateDestination(nextUrl.toString(), securityOptions);
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

        // Strip credentials if redirecting to a different origin (incl. a custom apiKey header name)
        if (nextUrl.origin !== initialOrigin) {
          credentialHeaderNames.forEach((name) => outboundHeaders.delete(name));
        }

        // RFC 9110: 303 always becomes GET; 301/302 after POST are switched to GET by user agents.
        if (
          res.status === 303 ||
          ((res.status === 301 || res.status === 302) && method === "POST")
        ) {
          if (method !== "HEAD") method = "GET";
          requestBodyData = undefined;
          outboundHeaders.delete("Content-Type");
        }

        await res.body?.cancel().catch(() => undefined);
        activeUrl = redirectCheck.url;
        continue; // Loop to execute redirect
      }

      // 7. Enforce Response Size Limit (Layer 10). Binary bodies get a lower cap (base64 envelope);
      //    SSE / NDJSON streams are read for a short window and returned as truncated.
      const durationMs = Math.round(performance.now() - t0);
      const contentType = res.headers.get("content-type") || undefined;
      const binary = !isTextContentType(contentType);
      const limit = binary ? MAX_BINARY_RESPONSE_BYTES : MAX_RESPONSE_BYTES;
      const read = await readResponseBytes(res, { maxBytes: limit, streamWindowMs: STREAM_WINDOW_MS });
      if (read.kind === "too-large") {
        return makeErrorResult(
          "RESPONSE_TOO_LARGE",
          binary
            ? `Binary response exceeded the ${limit / (1024 * 1024)}MB proxy limit. Use Browser mode to download larger files.`
            : `Response size exceeded maximum allowed limit of ${limit / (1024 * 1024)}MB.`,
          requestId,
        );
      }

      // Collect normalized headers
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const redactedHeaders = redactSensitiveHeaders(responseHeaders);

      const base: ApiExecutionResult = {
        success: true,
        executionMode: "apiforge-proxy",
        status: res.status,
        statusText: res.statusText,
        headers: redactedHeaders,
        contentType,
        durationMs,
        responseSizeBytes: read.bytes.byteLength,
        redirectCount,
        requestId,
        ...(read.truncated ? { streamTruncated: true } : {}),
      };

      if (binary) {
        return { ...base, isBinary: true, bodyBase64: bytesToBase64(read.bytes) };
      }

      const rawText = Buffer.from(read.bytes).toString("utf-8");
      let parsedBody: unknown = null;
      try {
        parsedBody = rawText ? JSON.parse(rawText) : null;
      } catch {
        parsedBody = null;
      }

      return { ...base, body: parsedBody !== null ? parsedBody : rawText, rawBody: rawText };
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
    } finally {
      clearTimeout(timer);
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
