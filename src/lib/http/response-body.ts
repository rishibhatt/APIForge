/**
 * Reads a Run API response the right way for its type: text (JSON, XML, HTML…), binary
 * (image, PDF, video, zip…) or a stream (SSE / NDJSON) that never ends on its own.
 */

/** Content types read as text. Anything else is binary. An empty type is treated as text. */
export function isTextContentType(contentType: string | null | undefined): boolean {
  const ct = (contentType ?? "").toLowerCase().split(";")[0]!.trim();
  if (!ct) return true;
  return (
    ct.startsWith("text/") ||
    /[/+](json|xml|yaml|x-yaml|javascript|ecmascript|graphql|x-www-form-urlencoded|problem\+json|ld\+json|csv|x-ndjson|ndjson|jsonl|json-seq)$/.test(ct) ||
    ct === "application/x-sh" ||
    ct === "image/svg+xml"
  );
}

/** SSE / NDJSON streams: how long to listen before showing what arrived. */
export const STREAM_WINDOW_MS = 5_000;

/** Responses that stay open and push data: read a short window, then stop. */
export function isStreamContentType(contentType: string | null | undefined): boolean {
  const ct = (contentType ?? "").toLowerCase();
  return ct.includes("text/event-stream") || ct.includes("ndjson") || ct.includes("jsonl") || ct.includes("json-seq");
}

export interface ReadBodyOptions {
  maxBytes: number;
  /** Streams only: stop reading after this long. */
  streamWindowMs: number;
}

export type ReadBodyResult =
  | { kind: "ok"; bytes: Uint8Array<ArrayBuffer>; truncated: boolean }
  | { kind: "too-large"; limit: number };

/**
 * Reads a response body with a size cap. Stream responses are cut after `streamWindowMs`
 * (or at the size cap) and returned as truncated instead of failing.
 */
export async function readResponseBytes(res: Response, opts: ReadBodyOptions): Promise<ReadBodyResult> {
  if (!res.body) return { kind: "ok", bytes: new Uint8Array(new ArrayBuffer(0)), truncated: false };
  const stream = isStreamContentType(res.headers.get("content-type"));
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  const deadline = stream ? Date.now() + opts.streamWindowMs : Infinity;

  while (true) {
    const remaining = deadline - Date.now();
    if (stream && remaining <= 0) {
      truncated = true;
      break;
    }
    const next = stream
      ? await Promise.race([
          reader.read(),
          new Promise<"timeout">((r) => setTimeout(() => r("timeout"), Math.max(remaining, 0))),
        ])
      : await reader.read();
    if (next === "timeout") {
      truncated = true;
      break;
    }
    if (next.done) break;
    if (!next.value) continue;
    total += next.value.byteLength;
    if (total > opts.maxBytes) {
      if (stream) {
        truncated = true;
        break;
      }
      await reader.cancel().catch(() => undefined);
      return { kind: "too-large", limit: opts.maxBytes };
    }
    chunks.push(next.value);
  }
  if (truncated) await reader.cancel().catch(() => undefined);

  const bytes = new Uint8Array(new ArrayBuffer(chunks.reduce((n, c) => n + c.byteLength, 0)));
  let off = 0;
  for (const c of chunks) {
    bytes.set(c, off);
    off += c.byteLength;
  }
  return { kind: "ok", bytes, truncated };
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return btoa(bin);
}

export function base64ToBlob(b64: string, contentType: string | undefined): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: contentType || "application/octet-stream" });
}

/** What the response preview can show inline. */
export type BinaryPreviewKind = "image" | "audio" | "video" | "pdf" | "none";

export function binaryPreviewKind(contentType: string | null | undefined): BinaryPreviewKind {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("audio/")) return "audio";
  if (ct.startsWith("video/")) return "video";
  if (ct.includes("application/pdf")) return "pdf";
  return "none";
}

/** File name for "Download": Content-Disposition filename, else one built from the type. */
export function downloadFileName(contentDisposition: string | undefined, contentType: string | undefined): string {
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition ?? "");
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1]).replace(/[\\/]/g, "_");
    } catch {
      return m[1].replace(/[\\/]/g, "_");
    }
  }
  const sub = (contentType ?? "").split(";")[0]!.split("/")[1]?.replace(/^x-/, "").replace(/\+.*$/, "");
  return `response.${sub && /^[a-z0-9.-]{1,12}$/i.test(sub) ? sub : "bin"}`;
}
