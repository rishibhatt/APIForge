import type { ApiScoreResult, NormalizedEndpoint } from "@/lib/api-quality-score/types";
import {
  extractStrengths,
  groupAndRankPatterns,
  normalizeFindings,
} from "./aggregateFindings";
import { classifyPersonality, type RoastPersonality } from "./personality";
import {
  getVerdictByScore,
  OPENINGS_BY_INTENSITY,
  ROAST_STRUCTURE_POOL,
  RULE_SPECIFIC_ROASTS,
} from "./roastTemplates";
import type { RoastStatusTier, RoastSummary, RoastTone } from "./types";

import { selectRoastMeme } from "./memeSelector";

function deriveStatusTier(score: number): RoastStatusTier {
  if (score >= 85) return "HEALTHY";
  if (score >= 70) return "QUESTIONABLE";
  if (score >= 55) return "CHAOTIC";
  if (score >= 40) return "CRIMINAL";
  return "NUCLEAR";
}

function deriveIntensityLevel(score: number): number {
  if (score >= 85) return 1;
  if (score >= 70) return 2;
  if (score >= 55) return 3;
  if (score >= 40) return 4;
  return 5;
}

export function getRoastTextVariant(
  summary: Pick<RoastSummary, "score" | "topPatterns" | "personality" | "strengths" | "totalEndpoints" | "totalFindings">,
  variantIndex = 0
): string {
  const intensity = deriveIntensityLevel(summary.score);
  const openings = OPENINGS_BY_INTENSITY[intensity] || OPENINGS_BY_INTENSITY[3]!;
  const openingText = openings[variantIndex % openings.length] || openings[0]!;

  let mainBody = "";
  const mainPattern = summary.topPatterns[0];
  if (mainPattern && RULE_SPECIFIC_ROASTS[mainPattern.ruleId]) {
    const pool = RULE_SPECIFIC_ROASTS[mainPattern.ruleId]!;
    mainBody = pool[variantIndex % pool.length] || pool[0]!;
  } else {
    const eligibleStructures = ROAST_STRUCTURE_POOL.filter(
      (s) =>
        (!s.minScore || summary.score >= s.minScore) &&
        (!s.maxScore || summary.score <= s.maxScore),
    );
    const struct = eligibleStructures[variantIndex % eligibleStructures.length] || ROAST_STRUCTURE_POOL[0]!;
    mainBody = struct.format({
      score: summary.score,
      personality: summary.personality || "CONFUSED",
      topFindingText: mainPattern?.technicalExplanation,
      secondaryFindingText: summary.topPatterns[1]?.technicalExplanation,
      strengthText: summary.strengths[0]?.title,
      endpointCount: summary.totalEndpoints,
      issueCount: summary.totalFindings,
    });
  }

  const parts = [openingText, mainBody];
  let roastText = parts.filter(Boolean).join(" ");

  if (roastText.length > 440) {
    roastText = roastText.slice(0, 430).trim() + "...";
  }
  return roastText;
}

export function generateRoastSummary(
  endpoints: NormalizedEndpoint[],
  scoreResult: ApiScoreResult,
  tone: RoastTone = "brutal",
  variantIndex = 0,
): RoastSummary {
  const findings = normalizeFindings(scoreResult.issues);
  const patterns = groupAndRankPatterns(findings, endpoints.length);
  const strengths = extractStrengths(endpoints, scoreResult.issues, scoreResult);
  const personality: RoastPersonality = classifyPersonality(endpoints, scoreResult);
  const score = Math.round(scoreResult.totalScore);
  const totalEndpoints = endpoints.length;
  const totalFindings = findings.length;

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low").length;

  const catMap = new Map<string, number>();
  for (const f of findings) {
    catMap.set(f.category, (catMap.get(f.category) ?? 0) + 1);
  }
  const categoryBreakdown = Array.from(catMap.entries()).map(([category, count]) => ({
    category,
    count,
  }));

  const topPatterns = patterns.slice(0, 5);
  const verdict = getVerdictByScore(score);

  const partialSummary = {
    score,
    topPatterns,
    personality,
    strengths,
    totalEndpoints,
    totalFindings,
  };

  const roastText = getRoastTextVariant(partialSummary, variantIndex);

  const tempSummary: RoastSummary = {
    score,
    statusTier: deriveStatusTier(score),
    totalEndpoints,
    totalFindings,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    categoryBreakdown,
    topPatterns,
    strengths,
    personality,
    roast: roastText,
    verdict,
    characterCount: roastText.length,
    tone,
  };

  const memeRes = selectRoastMeme(tempSummary);

  tempSummary.meme = {
    id: memeRes.meme.id,
    src: memeRes.meme.src,
    caption: memeRes.caption,
    mood: memeRes.meme.mood,
  };

  return tempSummary;
}
