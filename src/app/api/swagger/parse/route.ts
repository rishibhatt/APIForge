import { NextResponse } from "next/server";
import { parseSwaggerFile, parseSwaggerUrl } from "@/lib/swagger-parser";
import { readJsonObject } from "@/lib/http/read-json-body";
import { consumeRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { parseSpecFetchHeaders } from "@/lib/security/spec-fetch-headers";

const MAX_SPEC_FILE_BYTES = 10 * 1024 * 1024;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = consumeRateLimit(`parse:${getClientIp(request)}`);
  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, error: limited.message ?? "Rate limit exceeded" },
      { status: 429 },
    );
  }

  try {
    const ct = request.headers.get("content-type") ?? "";

    if (ct.includes("multipart/form-data")) {
      const declared = Number(request.headers.get("content-length") ?? "");
      if (Number.isFinite(declared) && declared > MAX_SPEC_FILE_BYTES + 64 * 1024) {
        return NextResponse.json(
          { success: false, error: "File exceeds 10MB limit" },
          { status: 413 },
        );
      }
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { success: false, error: "Missing file" },
          { status: 400 },
        );
      }
      if (file.size > MAX_SPEC_FILE_BYTES) {
        return NextResponse.json(
          { success: false, error: "File exceeds 10MB limit" },
          { status: 413 },
        );
      }
      const result = await parseSwaggerFile(file);
      return NextResponse.json({ success: true, ...result });
    }

    const parsedBody = await readJsonObject(request, 64 * 1024);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, error: parsedBody.error },
        { status: parsedBody.status },
      );
    }
    const body = parsedBody.body;
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) {
      return NextResponse.json(
        { success: false, error: "Missing url" },
        { status: 400 },
      );
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL" },
        { status: 400 },
      );
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { success: false, error: "Only http(s) URLs are allowed" },
        { status: 400 },
      );
    }

    const headers = parseSpecFetchHeaders(body.headers);
    if (!headers.ok) {
      return NextResponse.json({ success: false, error: headers.error }, { status: 400 });
    }

    const result = await parseSwaggerUrl(url, { headers: headers.headers });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse failed";
    return NextResponse.json({ success: false, error: message }, { status: 422 });
  }
}
