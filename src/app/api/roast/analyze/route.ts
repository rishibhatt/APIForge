import { NextResponse } from "next/server";
import { parseSwaggerFile, parseSwaggerUrl } from "@/lib/swagger-parser";
import { normalizeFromEndpoints } from "@/lib/api-quality-score/normalize-api-input";
import { calculateApiScore } from "@/lib/scoringEngine";
import { generateRoastSummary } from "@/lib/roast/generateRoast";
import { generateAiRoastContent } from "@/lib/roast/generateAiRoast";
import { generateReportId, storeRoastReport } from "@/lib/roast/roastStorage";
import type { RoastTone, SanitizedRoastReport } from "@/lib/roast/types";
import { resolveAndValidateDestination } from "@/lib/security/url-validation";
import { checkRateLimitAndConcurrency } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    const ct = request.headers.get("content-type") ?? "";

    let parseResult;
    let specUrlInput: string | undefined;
    let toneInput: RoastTone = "brutal";

    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const tone = form.get("tone") as RoastTone | null;
      if (tone) toneInput = tone;

      if (!(file instanceof File)) {
        return NextResponse.json(
          { success: false, error: "Missing OpenAPI/Swagger file" },
          { status: 400 },
        );
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "File exceeds 10MB limit" },
          { status: 400 },
        );
      }
      parseResult = await parseSwaggerFile(file);
    } else {
      const body = (await request.json()) as { url?: string; tone?: RoastTone };
      const url = typeof body.url === "string" ? body.url.trim() : "";
      if (body.tone) toneInput = body.tone;

      if (!url) {
        return NextResponse.json(
          { success: false, error: "Missing URL parameter" },
          { status: 400 },
        );
      }

      // Security SSRF Validation
      const secVal = await resolveAndValidateDestination(url, {
        allowLoopback: false,
        allowPrivateNetworks: false,
      });

      if (!secVal.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: secVal.message || "Target URL is not permitted for security reasons.",
          },
          { status: 400 },
        );
      }

      specUrlInput = url;
      parseResult = await parseSwaggerUrl(url);
    }

    const endpoints = parseResult.endpoints || [];
    if (endpoints.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid operations or endpoints found in the provided specification.",
        },
        { status: 422 },
      );
    }

    const normalizedRows = normalizeFromEndpoints(endpoints);
    const scoreResult = calculateApiScore(normalizedRows);
    const summary = generateRoastSummary(normalizedRows, scoreResult, toneInput);

    // AI Roast Enrichment
    const aiContent = await generateAiRoastContent({
      score: summary.score,
      verdict: summary.verdict,
      personality: summary.personality || "CONFUSED",
      totalEndpoints: summary.totalEndpoints,
      topPatterns: summary.topPatterns,
      strengths: summary.strengths,
    });

    if (aiContent) {
      const fullAiRoast = aiContent.opening
        ? `${aiContent.opening} ${aiContent.roast}`
        : aiContent.roast;
      if (fullAiRoast) {
        summary.roast = fullAiRoast;
        summary.characterCount = fullAiRoast.length;
      }
      if (aiContent.caption && summary.meme) {
        summary.meme.caption = aiContent.caption;
      }
    }

    const reportId = generateReportId();
    const rawReport: SanitizedRoastReport = {
      id: reportId,
      createdAt: Date.now(),
      title: parseResult.title || "API Specification",
      version: parseResult.version,
      specUrl: specUrlInput,
      summary,
      endpointsCount: endpoints.length,
      score: summary.score,
      breakdown: { ...scoreResult.breakdown },
      suggestions: scoreResult.suggestions,
    };

    storeRoastReport(rawReport);

    return NextResponse.json({
      success: true,
      reportId,
      report: rawReport,
      endpoints: endpoints.map((e) => ({ path: e.path, method: e.method })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Roast analysis failed";
    return NextResponse.json({ success: false, error: message }, { status: 422 });
  }
}
