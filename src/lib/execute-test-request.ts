import type {
  ApiExecutionRequest,
  ApiExecutionResult,
  ExecutionMode,
} from "@/types/execution";
import {
  executeBrowserRequest,
  executeProxyRequestClient,
} from "./browser-execution";
import type { RequestFile } from "./http/request-body";

export function joinBaseAndPath(base: string, path: string): string {
  const b = base.trim().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!b) return p;
  return `${b}${p}`;
}

/**
 * Determines whether a browser execution result warrants an automatic fallback to APIForge proxy.
 */
function shouldFallbackToProxy(
  browserResult: ApiExecutionResult,
): boolean {
  if (browserResult.success) return false;
  if (!browserResult.proxyAvailable) return false;
  const code = browserResult.error?.code;
  return code === "BROWSER_CORS_BLOCKED" || code === "BROWSER_NETWORK_ERROR";
}

/**
 * Centralized client-side execution gateway orchestrating AUTO, BROWSER, and APIFORGE_PROXY modes.
 */
export async function executeTestRequestClient(
  reqDef: ApiExecutionRequest,
  mode: ExecutionMode = "AUTO",
  /** Files referenced by multipart parts or a binary body. */
  files: RequestFile[] = [],
): Promise<ApiExecutionResult> {
  if (mode === "BROWSER") {
    return executeBrowserRequest(reqDef, files);
  }

  if (mode === "APIFORGE_PROXY") {
    return executeProxyRequestClient(reqDef, files);
  }

  // AUTO mode: Attempt browser execution first
  const browserResult = await executeBrowserRequest(reqDef, files);

  if (shouldFallbackToProxy(browserResult)) {
    const proxyResult = await executeProxyRequestClient(reqDef, files);
    return proxyResult;
  }

  return browserResult;
}
