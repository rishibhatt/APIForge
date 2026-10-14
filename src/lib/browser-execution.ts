import type {
  ApiExecutionRequest,
  ApiExecutionResult,
} from "@/types/execution";
import {
  applyBodyContentType,
  applyQueryParams,
  buildRequestBody,
  RequestBodyError,
  type BuiltBody,
  type RequestFile,
} from "@/lib/http/request-body";
import {
  base64ToBlob,
  isTextContentType,
  readResponseBytes,
  STREAM_WINDOW_MS,
} from "@/lib/http/response-body";

/** Browser mode reads the whole response in memory; keep it bounded. */
const BROWSER_MAX_RESPONSE_BYTES = 50 * 1024 * 1024;

export async function executeBrowserRequest(
  reqDef: ApiExecutionRequest,
  files: RequestFile[] = [],
): Promise<ApiExecutionResult> {
  const requestId = `req_browser_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const t0 = performance.now();

  let built: BuiltBody;
  try {
    built = buildRequestBody(reqDef, files);
  } catch (e) {
    return {
      success: false,
      executionMode: "browser",
      requestId,
      durationMs: 0,
      proxyAvailable: false,
      error: {
        code: "UNKNOWN",
        message: e instanceof RequestBodyError ? e.message : "Could not build the request body.",
      },
    };
  }

  try {
    const u = new URL(reqDef.url);
    applyQueryParams(u, reqDef.queryParams);

    const headers = new Headers(reqDef.headers);

    // Apply Auth
    if (reqDef.auth && reqDef.auth.type !== "none") {
      const { type, bearerToken, apiKeyName, apiKeyValue, apiKeyIn, basicUser, basicPass } = reqDef.auth;
      const hasAuth = headers.has("Authorization");

      if (type === "bearer" && bearerToken?.trim() && !hasAuth) {
        headers.set("Authorization", `Bearer ${bearerToken.trim()}`);
      } else if (type === "basic" && (basicUser || basicPass) && !hasAuth) {
        const raw = `${basicUser ?? ""}:${basicPass ?? ""}`;
        const token = btoa(unescape(encodeURIComponent(raw)));
        headers.set("Authorization", `Basic ${token}`);
      } else if (type === "apiKey" && apiKeyName?.trim() && apiKeyValue?.trim()) {
        const ak = apiKeyName.trim();
        const av = apiKeyValue.trim();
        if (apiKeyIn === "query") {
          u.searchParams.set(ak, av);
        } else if (!headers.has(ak)) {
          headers.set(ak, av);
        }
      }
    }

    applyBodyContentType(headers, built);

    const controller = new AbortController();
    const timeoutMs = reqDef.timeoutMs || 10_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(u.toString(), {
        method: reqDef.method || "GET",
        headers,
        body: built.body,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }

    const durationMs = Math.round(performance.now() - t0);
    const contentType = res.headers.get("content-type") || undefined;
    let read: Awaited<ReturnType<typeof readResponseBytes>>;
    try {
      read = await readResponseBytes(res, {
        maxBytes: BROWSER_MAX_RESPONSE_BYTES,
        streamWindowMs: STREAM_WINDOW_MS,
      });
    } finally {
      clearTimeout(timer);
    }

    const resHeaders: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      resHeaders[key] = val;
    });

    if (read.kind === "too-large") {
      return {
        success: false,
        executionMode: "browser",
        requestId,
        durationMs,
        proxyAvailable: false,
        error: {
          code: "RESPONSE_TOO_LARGE",
          message: `Response is larger than ${BROWSER_MAX_RESPONSE_BYTES / (1024 * 1024)}MB.`,
        },
      };
    }

    const base: ApiExecutionResult = {
      success: true,
      executionMode: "browser",
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
      contentType,
      durationMs,
      responseSizeBytes: read.bytes.byteLength,
      requestId,
      proxyAvailable: false,
      ...(read.truncated ? { streamTruncated: true } : {}),
    };

    if (!isTextContentType(contentType)) {
      return {
        ...base,
        isBinary: true,
        binaryBody: new Blob([read.bytes], { type: contentType || "application/octet-stream" }),
      };
    }

    const text = new TextDecoder().decode(read.bytes);
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    return { ...base, body: parsed !== null ? parsed : text, rawBody: text };
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - t0);
    const msg = err instanceof Error ? err.message : String(err);

    const isCorsOrNetwork =
      msg.toLowerCase().includes("fetch") ||
      msg.toLowerCase().includes("cors") ||
      msg.toLowerCase().includes("networkerror") ||
      msg.toLowerCase().includes("failed to fetch") ||
      err instanceof TypeError;

    const isTimeout = err instanceof Error && err.name === "AbortError";

    return {
      success: false,
      executionMode: "browser",
      requestId,
      durationMs,
      proxyAvailable: isCorsOrNetwork && !isTimeout,
      error: {
        code: isTimeout
          ? "REQUEST_TIMEOUT"
          : isCorsOrNetwork
            ? "BROWSER_CORS_BLOCKED"
            : "BROWSER_NETWORK_ERROR",
        message: isTimeout
          ? "Browser request timed out."
          : "The target API rejected the request. This is usually caused by CORS restrictions or network policies.",
        retryable: true,
      },
    };
  }
}

export async function executeProxyRequestClient(
  reqDef: ApiExecutionRequest,
  files: RequestFile[] = [],
): Promise<ApiExecutionResult> {
  const t0 = performance.now();
  try {
    // Files cannot ride in JSON: send a multipart envelope with the request as a "request" field.
    let init: RequestInit;
    if (files.length > 0) {
      const fd = new FormData();
      fd.append("request", JSON.stringify(reqDef));
      files.forEach((f, i) => fd.append(`file${i}`, f, f.name || `file${i}`));
      init = { method: "POST", body: fd };
    } else {
      init = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqDef),
      };
    }
    const res = await fetch("/api/test-request", init);

    const data = (await res.json()) as ApiExecutionResult;
    if (data.isBinary && data.bodyBase64) {
      data.binaryBody = base64ToBlob(data.bodyBase64, data.contentType);
      delete data.bodyBase64;
    }
    return data;
  } catch (err: unknown) {
    return {
      success: false,
      executionMode: "apiforge-proxy",
      requestId: `req_client_err_${Date.now()}`,
      durationMs: Math.round(performance.now() - t0),
      error: {
        code: "TARGET_UNREACHABLE",
        message:
          err instanceof Error
            ? err.message
            : "Failed to communicate with APIForge proxy gateway.",
      },
    };
  }
}
