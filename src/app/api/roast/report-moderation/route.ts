import { NextResponse } from "next/server";
import { checkRateLimitAndConcurrency } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const clientId =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("cf-connecting-ip") ||
      "anonymous_client";

    const rateCheck = checkRateLimitAndConcurrency(clientId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: rateCheck.message || "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { reportId, reason } = body || {};

    if (!reportId || typeof reportId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing reportId parameter" },
        { status: 400 },
      );
    }

    // Safe in-memory moderation log or store
    console.info(`[Roast Moderation Report] reportId=${reportId}, reason=${reason || "unspecified"}`);

    return NextResponse.json({
      success: true,
      message: "Report received. Our moderation team will review this roast.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to process report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
