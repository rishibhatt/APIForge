export type ExecutionMode = "AUTO" | "BROWSER" | "APIFORGE_PROXY";

export type TestExecutionErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "PRIVATE_NETWORK_BLOCKED"
  | "LOOPBACK_BLOCKED"
  | "METADATA_ENDPOINT_BLOCKED"
  | "DNS_RESOLUTION_FAILED"
  | "REDIRECT_BLOCKED"
  | "PORT_BLOCKED"
  | "REQUEST_TIMEOUT"
  | "REQUEST_TOO_LARGE"
  | "RESPONSE_TOO_LARGE"
  | "RATE_LIMITED"
  | "CONCURRENCY_LIMIT"
  | "TARGET_UNREACHABLE"
  | "TARGET_TLS_ERROR"
  | "TARGET_HTTP_ERROR"
  | "BROWSER_CORS_BLOCKED"
  | "BROWSER_NETWORK_ERROR"
  | "UNKNOWN";

export type ExecutionStatusStep =
  | "idle"
  | "preparing"
  | "validating_target"
  | "executing"
  | "receiving"
  | "validating_schema"
  | "complete"
  | "blocked";

export interface ApiExecutionAuth {
  type: "none" | "bearer" | "apiKey" | "basic";
  bearerToken?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyIn?: "header" | "query";
  basicUser?: string;
  basicPass?: string;
}

export interface ApiExecutionRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  auth?: ApiExecutionAuth;
  timeoutMs?: number;
}

export interface ApiExecutionResult {
  success: boolean;
  executionMode: "browser" | "apiforge-proxy";
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: unknown;
  rawBody?: string;
  contentType?: string;
  durationMs?: number;
  responseSizeBytes?: number;
  redirectCount?: number;
  requestId: string;
  proxyAvailable?: boolean;
  error?: {
    code: TestExecutionErrorCode;
    message: string;
    retryable?: boolean;
  };
}
