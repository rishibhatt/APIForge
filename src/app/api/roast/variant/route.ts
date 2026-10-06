import { NextResponse } from "next/server";
import { generateAiRoastContent } from "@/lib/roast/generateAiRoast";
import { getRoastTextVariant } from "@/lib/roast/generateRoast";
import type { RoastSummary } from "@/lib/roast/types";
import { readJsonObject } from "@/lib/http/read-json-body";
import { consumeRateLimit, getClientIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = consumeRateLimit(`ai:${getClientIp(request)}`);
  if (!limited.allowed) {
    return NextResponse.json(
      { success: false, error: limited.message ?? "Rate limit exceeded" },
      { status: 429 },
    );
  }

  try {
    const parsedBody = await readJsonObject(request, 256 * 1024);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, error: parsedBody.error },
        { status: parsedBody.status },
      );
    }
    const body = parsedBody.body as {
      summary?: RoastSummary;
      variantIndex?: unknown;
      title?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.slice(0, 120) : "";

    if (!body.summary || typeof body.summary !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing roast summary" },
        { status: 400 },
      );
    }

    // The summary comes from the client: coerce the fields the generators read so a
    // malformed payload cannot crash them, and cap what is forwarded into the AI prompt.
    const rawSummary = body.summary;
    const summary: RoastSummary = {
      ...rawSummary,
      score: Number.isFinite(rawSummary.score) ? rawSummary.score : 0,
      verdict: typeof rawSummary.verdict === "string" ? rawSummary.verdict.slice(0, 200) : "",
      totalEndpoints: Number.isFinite(rawSummary.totalEndpoints) ? rawSummary.totalEndpoints : 0,
      totalFindings: Number.isFinite(rawSummary.totalFindings) ? rawSummary.totalFindings : 0,
      topPatterns: (Array.isArray(rawSummary.topPatterns) ? rawSummary.topPatterns : [])
        .filter((p) => p && typeof p === "object")
        .slice(0, 5)
        .map((p) => ({
          ...p,
          technicalExplanation:
            typeof p.technicalExplanation === "string"
              ? p.technicalExplanation.slice(0, 300)
              : "",
          representativeEndpoints: (Array.isArray(p.representativeEndpoints) ? p.representativeEndpoints : [])
            .filter((e): e is string => typeof e === "string")
            .slice(0, 3)
            .map((e) => e.slice(0, 160)),
        })),
      strengths: (Array.isArray(rawSummary.strengths) ? rawSummary.strengths : [])
        .filter((s) => s && typeof s === "object")
        .slice(0, 5),
    };
    const variantIndex =
      typeof body.variantIndex === "number" && Number.isFinite(body.variantIndex)
        ? Math.abs(Math.trunc(body.variantIndex))
        : 0;

    // Try AI generation first for high uniqueness
    const aiContent = await generateAiRoastContent({
      title,
      variantIndex,
      score: summary.score,
      verdict: summary.verdict,
      personality: summary.personality || "CONFUSED",
      totalEndpoints: summary.totalEndpoints,
      topPatterns: summary.topPatterns || [],
      strengths: summary.strengths || [],
    });

    let newRoastText = "";
    if (aiContent && aiContent.roast) {
      newRoastText = aiContent.opening
        ? `${aiContent.opening} ${aiContent.roast}`
        : aiContent.roast;
    }

    // Fallback to pool-based structural variant
    if (!newRoastText) {
      newRoastText = getRoastTextVariant(summary, variantIndex, { title });
    }

    return NextResponse.json({
      success: true,
      roastText: newRoastText,
      caption: aiContent?.caption,
      characterCount: newRoastText.length,
      variantIndex,
    });
  } catch (e) {
    console.error("[roast/variant] failed:", e);
    return NextResponse.json(
      { success: false, error: "Failed to generate roast variant" },
      { status: 500 },
    );
  }
}
