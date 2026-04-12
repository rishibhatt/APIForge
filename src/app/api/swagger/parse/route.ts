import { NextResponse } from "next/server";
import { parseSwaggerFile, parseSwaggerUrl } from "@/lib/swagger-parser";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const ct = request.headers.get("content-type") ?? "";

    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { success: false, error: "Missing file" },
          { status: 400 },
        );
      }
      const result = await parseSwaggerFile(file);
      return NextResponse.json({ success: true, ...result });
    }

    const body = (await request.json()) as { url?: string };
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

    const result = await parseSwaggerUrl(url);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse failed";
    return NextResponse.json({ success: false, error: message }, { status: 422 });
  }
}
