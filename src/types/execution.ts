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

/**
 * How `body` / `formParts` / files become the HTTP body.
 * json (default): JSON text. text: sent as is. form: urlencoded. multipart: FormData. binary: one raw file.
 */
export type ExecutionBodyKind = "json" | "text" | "form" | "multipart" | "binary";

/** One field of a form or multipart body. A file part points into the request's file list. */
export interface ExecutionFormPart {
  name: string;
  /** Text value (text parts). */
  value?: string;
  /** Index into the files sent with the request (file parts). */
  fileIndex?: number;
  fileName?: string;
  /** Per-part Content-Type (OpenAPI `encoding.contentType`), e.g. application/json or image/png. */
  contentType?: string;
}

export interface ApiExecutionRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  /** Array values are sent as repeated keys (`?id=1&id=2`). */
  queryParams?: Record<string, string | string[]>;
  body?: unknown;
  bodyKind?: ExecutionBodyKind;
  /** Fields for `form` and `multipart` bodies. */
  formParts?: ExecutionFormPart[];
  /** File index for a `binary` body. */
  binaryFileIndex?: number;
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
  /** Response is not text (image, PDF, video, zip…): `body`/`rawBody` are empty, see `bodyBase64` / `binaryBody`. */
  isBinary?: boolean;
  /** Binary response from the proxy, base64-encoded for the JSON envelope. */
  bodyBase64?: string;
  /** Binary response as a Blob (client only; built from `bodyBase64` or read directly in browser mode). */
  binaryBody?: Blob;
  /** Streaming response (text/event-stream, NDJSON stream) cut off after a short read window. */
  streamTruncated?: boolean;
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
