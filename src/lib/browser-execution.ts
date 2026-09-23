import type {
  ApiExecutionRequest,
  ApiExecutionResult,
} from "@/types/execution";

export async function executeBrowserRequest(
  reqDef: ApiExecutionRequest,
): Promise<ApiExecutionResult> {
  const requestId = `req_browser_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const t0 = performance.now();

  try {
    const u = new URL(reqDef.url);
    if (reqDef.queryParams) {
      for (const [k, v] of Object.entries(reqDef.queryParams)) {
        if (v !== undefined && v !== null) {
          u.searchParams.set(k, v);
        }
      }
    }

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

    let bodyData: BodyInit | undefined;
    if (reqDef.body !== undefined && reqDef.body !== null) {
      bodyData =
        typeof reqDef.body === "string"
          ? reqDef.body
          : JSON.stringify(reqDef.body);
      if (!headers.has("Content-Type") && !headers.has("content-type")) {
        headers.set("Content-Type", "application/json");
      }
    }

    const controller = new AbortController();
    const timeoutMs = reqDef.timeoutMs || 10_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(u.toString(), {
      method: reqDef.method || "GET",
      headers,
      body: bodyData,
      signal: controller.signal,
    });

    clearTimeout(timer);

    const durationMs = Math.round(performance.now() - t0);
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    const resHeaders: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      resHeaders[key] = val;
    });

    return {
      success: true,
      executionMode: "browser",
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
      body: parsed !== null ? parsed : text,
      rawBody: text,
      contentType: res.headers.get("content-type") || undefined,
      durationMs,
      responseSizeBytes: new Blob([text]).size,
      requestId,
      proxyAvailable: false,
    };
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
): Promise<ApiExecutionResult> {
  const t0 = performance.now();
  try {
    const res = await fetch("/api/test-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqDef),
    });

    const data = (await res.json()) as ApiExecutionResult;
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
