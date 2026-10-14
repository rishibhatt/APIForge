import { NextRequest } from "next/server";
import type { ApiExecutionRequest } from "@/types/execution";
import { executeProxyRequest, MAX_REQUEST_BODY_BYTES } from "@/lib/proxy-execution";
import {
  acquireConcurrencySlot,
  checkRateLimitAndConcurrency,
  getClientIp,
  releaseConcurrencySlot,
} from "@/lib/security/rate-limit";
import { readJsonObject } from "@/lib/http/read-json-body";

export const runtime = "nodejs";

/** Envelope headroom over the 2MB body cap: headers, query, auth and multipart framing. */
const ENVELOPE_BYTES = MAX_REQUEST_BODY_BYTES + 1024 * 1024;
const MAX_ENVELOPE_FILES = 20;

function envelopeError(status: number, code: string, message: string) {
  return Response.json(
    {
      success: false,
      executionMode: "apiforge-proxy",
      requestId: `req_err_${Date.now()}`,
      error: { code, message },
    },
    { status },
  );
}

/**
 * Two envelopes: JSON (`ApiExecutionRequest`), or multipart when the request carries files —
 * a `request` field with the JSON plus `file0`, `file1`, … parts.
 */
async function readEnvelope(
  req: NextRequest,
): Promise<{ ok: true; body: ApiExecutionRequest; files: Blob[] } | { ok: false; res: Response }> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("multipart/form-data")) {
    const parsedBody = await readJsonObject(req, ENVELOPE_BYTES);
    if (!parsedBody.ok) {
      return {
        ok: false,
        res: envelopeError(
          parsedBody.status,
          parsedBody.status === 413 ? "REQUEST_TOO_LARGE" : "INVALID_URL",
          parsedBody.status === 413 ? "Request payload too large." : "Invalid JSON request payload.",
        ),
      };
    }
    return { ok: true, body: parsedBody.body as unknown as ApiExecutionRequest, files: [] };
  }

  const declared = Number(req.headers.get("content-length") ?? "");
  if (!Number.isFinite(declared) || declared <= 0 || declared > ENVELOPE_BYTES) {
    return {
      ok: false,
      res: envelopeError(
        413,
        "REQUEST_TOO_LARGE",
        `Uploads through the APIForge proxy are limited to ${MAX_REQUEST_BODY_BYTES / (1024 * 1024)}MB. Use Browser mode for larger files.`,
      ),
    };
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { ok: false, res: envelopeError(400, "INVALID_URL", "Invalid multipart request payload.") };
  }
  const raw = form.get("request");
  let body: unknown;
  try {
    body = typeof raw === "string" ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, res: envelopeError(400, "INVALID_URL", "Missing request description in upload.") };
  }
  const files: Blob[] = [];
  for (let i = 0; i < MAX_ENVELOPE_FILES; i++) {
    const f = form.get(`file${i}`);
    if (!(f instanceof Blob)) break;
    files.push(f);
  }
  return { ok: true, body: body as ApiExecutionRequest, files };
}

export async function POST(req: NextRequest) {
  const envelope = await readEnvelope(req);
  if (!envelope.ok) return envelope.res;
  const { body, files } = envelope;

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
    const result = await executeProxyRequest(body, clientIp, files);
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
