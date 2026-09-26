import { NextResponse } from "next/server";
import { generateAiRoastContent } from "@/lib/roast/generateAiRoast";
import { getRoastTextVariant } from "@/lib/roast/generateRoast";
import type { RoastSummary } from "@/lib/roast/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      summary?: RoastSummary;
      variantIndex?: number;
    };

    if (!body.summary) {
      return NextResponse.json(
        { success: false, error: "Missing roast summary" },
        { status: 400 },
      );
    }

    const summary = body.summary;
    const variantIndex = typeof body.variantIndex === "number" ? body.variantIndex : 0;

    // Try AI generation first for high uniqueness
    const aiContent = await generateAiRoastContent({
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
      newRoastText = getRoastTextVariant(summary, variantIndex);
    }

    return NextResponse.json({
      success: true,
      roastText: newRoastText,
      caption: aiContent?.caption,
      characterCount: newRoastText.length,
      variantIndex,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to generate roast variant";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
