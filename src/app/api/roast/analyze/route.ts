import { NextResponse } from "next/server";
import { parseSwaggerFile, parseSwaggerUrl } from "@/lib/swagger-parser";
import { parseSpecFetchHeaders } from "@/lib/security/spec-fetch-headers";
import { normalizeFromEndpoints } from "@/lib/api-quality-score/normalize-api-input";
import { calculateApiScore } from "@/lib/scoringEngine";
import { generateRoastSummary } from "@/lib/roast/generateRoast";
import { generateAiRoastContent } from "@/lib/roast/generateAiRoast";
import { generateReportId, storeRoastReport } from "@/lib/roast/roastStorage";
import type { RoastTone, SanitizedRoastReport } from "@/lib/roast/types";
import { resolveAndValidateDestination } from "@/lib/security/url-validation";
import {
  acquireConcurrencySlot,
  checkRateLimitAndConcurrency,
  getClientIp,
  releaseConcurrencySlot,
} from "@/lib/security/rate-limit";
import { readJsonObject } from "@/lib/http/read-json-body";

const ROAST_TONES: readonly RoastTone[] = ["professional", "brutal", "nuclear"];
const ROAST_SECURITY = { allowLoopback: false, allowPrivateNetworks: false } as const;
const MAX_SPEC_FILE_BYTES = 10 * 1024 * 1024;

function toRoastTone(v: unknown): RoastTone | null {
  return typeof v === "string" && (ROAST_TONES as readonly string[]).includes(v)
    ? (v as RoastTone)
    : null;
}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  // Previously the check ran without ever recording the request, so the limit never tripped.
  const clientId = `roast:${getClientIp(request)}`;
  const rateCheck = checkRateLimitAndConcurrency(clientId);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: rateCheck.message || "Rate limit exceeded" },
      { status: 429 },
    );
  }

  acquireConcurrencySlot(clientId);
  try {
    const ct = request.headers.get("content-type") ?? "";

    let parseResult;
    let specUrlInput: string | undefined;
    let toneInput: RoastTone = "brutal";

    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const tone = toRoastTone(form.get("tone"));
      if (tone) toneInput = tone;

      if (!(file instanceof File)) {
        return NextResponse.json(
          { success: false, error: "Missing OpenAPI/Swagger file" },
          { status: 400 },
        );
      }
      if (file.size > MAX_SPEC_FILE_BYTES) {
        return NextResponse.json(
          { success: false, error: "File exceeds 10MB limit" },
          { status: 413 },
        );
      }
      parseResult = await parseSwaggerFile(file, { security: ROAST_SECURITY });
    } else {
      const parsedBody = await readJsonObject(request, 64 * 1024);
      if (!parsedBody.ok) {
        return NextResponse.json(
          { success: false, error: parsedBody.error },
          { status: parsedBody.status },
        );
      }
      const body = parsedBody.body;
      const url = typeof body.url === "string" ? body.url.trim() : "";
      const tone = toRoastTone(body.tone);
      if (tone) toneInput = tone;

      if (!url) {
        return NextResponse.json(
          { success: false, error: "Missing URL parameter" },
          { status: 400 },
        );
      }

      // Security SSRF Validation
      const secVal = await resolveAndValidateDestination(url, ROAST_SECURITY);

      if (!secVal.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: secVal.message || "Target URL is not permitted for security reasons.",
          },
          { status: 400 },
        );
      }

      const authHeaders = parseSpecFetchHeaders(body.headers);
      if (!authHeaders.ok) {
        return NextResponse.json({ success: false, error: authHeaders.error }, { status: 400 });
      }

      specUrlInput = url;
      // Strict policy applies to every hop (redirects, Swagger UI assets, external $refs), not just the input URL.
      parseResult = await parseSwaggerUrl(url, { security: ROAST_SECURITY, headers: authHeaders.headers });
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
    const apiTitle = parseResult.title || "";
    const summary = generateRoastSummary(normalizedRows, scoreResult, toneInput, 0, apiTitle);

    // AI Roast Enrichment
    const aiContent = await generateAiRoastContent({
      title: apiTitle,
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
      if (aiContent.verdict) {
        summary.verdict = aiContent.verdict;
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
  } finally {
    releaseConcurrencySlot(clientId);
  }
}
