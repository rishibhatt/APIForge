import type { ApiExecutionRequest, ExecutionBodyKind } from "@/types/execution";

/**
 * Builds the outgoing HTTP body for a Run API request. Shared by browser mode and the proxy,
 * so JSON, urlencoded forms, multipart uploads and raw binary bodies behave the same in both.
 * Uses only web platform types (FormData, Blob, URLSearchParams), available in browsers and Node 18+.
 */

export interface BuiltBody {
  body: BodyInit | undefined;
  /**
   * Content-Type to send. `null` means "remove any Content-Type header": for multipart, fetch
   * must write `multipart/form-data; boundary=…` itself, and a hand-set header has no boundary.
   */
  contentType: string | null;
  /** Total payload bytes, for size limits. */
  size: number;
}

/** A file attached to the request (browser File, or a Blob rebuilt from the proxy envelope). */
export type RequestFile = Blob & { name?: string };

export class RequestBodyError extends Error {}

const textBytes = (s: string) => new TextEncoder().encode(s).byteLength;

function headerValue(headers: Record<string, string> | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

function fileAt(files: RequestFile[], index: number | undefined): RequestFile {
  const f = index === undefined ? undefined : files[index];
  if (!f) throw new RequestBodyError("A file part points at a file that was not attached.");
  return f;
}

export function buildRequestBody(req: ApiExecutionRequest, files: RequestFile[] = []): BuiltBody {
  const kind: ExecutionBodyKind = req.bodyKind ?? "json";
  const userType = headerValue(req.headers, "content-type");

  switch (kind) {
    case "form": {
      const params = new URLSearchParams();
      for (const p of req.formParts ?? []) params.append(p.name, p.value ?? "");
      const text = params.toString();
      return {
        body: text,
        contentType: userType && /urlencoded/i.test(userType) ? userType : "application/x-www-form-urlencoded",
        size: textBytes(text),
      };
    }
    case "multipart": {
      const fd = new FormData();
      let size = 0;
      for (const p of req.formParts ?? []) {
        if (p.fileIndex !== undefined) {
          const f = fileAt(files, p.fileIndex);
          const typed = p.contentType && p.contentType !== f.type ? new Blob([f], { type: p.contentType }) : f;
          fd.append(p.name, typed, p.fileName || f.name || "file");
          size += f.size;
        } else {
          const v = p.value ?? "";
          // A JSON (or other typed) part needs its own Content-Type, which only a Blob part carries.
          if (p.contentType && !/^text\/plain/i.test(p.contentType)) {
            fd.append(p.name, new Blob([v], { type: p.contentType }), p.name);
          } else {
            fd.append(p.name, v);
          }
          size += textBytes(v);
        }
      }
      return { body: fd, contentType: null, size };
    }
    case "binary": {
      const f = fileAt(files, req.binaryFileIndex);
      return {
        body: f,
        contentType: userType || f.type || "application/octet-stream",
        size: f.size,
      };
    }
    case "text":
    case "json":
    default: {
      if (req.body === undefined || req.body === null) return { body: undefined, contentType: userType ?? null, size: 0 };
      const text = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      return {
        body: text,
        contentType: userType || (kind === "text" ? "text/plain" : "application/json"),
        size: textBytes(text),
      };
    }
  }
}

/** Applies the built body's Content-Type to a Headers object (sets it, or removes it for multipart). */
export function applyBodyContentType(headers: Headers, built: BuiltBody): void {
  if (built.body === undefined) return;
  headers.delete("Content-Type");
  if (built.contentType) headers.set("Content-Type", built.contentType);
}

/** Adds query params to a URL; array values become repeated keys. */
export function applyQueryParams(url: URL, query: ApiExecutionRequest["queryParams"], skip?: (k: string, v: string) => boolean): void {
  if (!query) return;
  for (const [k, raw] of Object.entries(query)) {
    if (raw === undefined || raw === null) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    url.searchParams.delete(k);
    for (const v of values) {
      if (typeof v !== "string" || (skip && skip(k, v))) continue;
      url.searchParams.append(k, v);
    }
  }
}
