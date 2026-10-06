import type { ApiScoreResult, NormalizedEndpoint } from "@/lib/api-quality-score/types";
import {
  extractStrengths,
  groupAndRankPatterns,
  normalizeFindings,
} from "./aggregateFindings";
import { classifyPersonality, type RoastPersonality } from "./personality";
import {
  CLEAN_LINES,
  CREDIT_LINES,
  NITPICK_LEADS,
  GENERIC_LINES,
  getVerdictByScore,
  hashSeed,
  intensityForScore,
  OPENINGS,
  pick,
  RULE_LINES,
  type RoastLineContext,
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

type RoastTextInput = Pick<
  RoastSummary,
  "score" | "topPatterns" | "personality" | "strengths" | "totalEndpoints" | "totalFindings"
>;

/** Stable per-spec seed: same API → same roast; different APIs → different picks. */
export function roastSeed(summary: RoastTextInput, title = ""): number {
  const top = summary.topPatterns[0];
  return hashSeed(
    [
      title,
      summary.score,
      summary.totalEndpoints,
      summary.totalFindings,
      top?.ruleId ?? "",
      top?.representativeEndpoints.join("|") ?? "",
    ].join("::"),
  );
}

function lineContext(summary: RoastTextInput, title: string, patternIndex = 0): RoastLineContext {
  const pattern = summary.topPatterns[patternIndex];
  return {
    title: title.trim() || "This API",
    path: pattern?.representativeEndpoints[0] ?? "the first endpoint we opened",
    count: pattern?.count ?? summary.totalFindings,
    pct: pattern ? Math.min(100, pattern.percentage) : 0,
    total: summary.totalEndpoints,
    issues: summary.totalFindings,
    score: summary.score,
    strength: summary.strengths[0]?.title,
  };
}

/**
 * Build the roast paragraph: opening (by score) + punchline about the top real finding
 * + an optional second finding or a credit line. `variantIndex` walks every pool at once.
 */
export function getRoastTextVariant(
  summary: RoastTextInput,
  variantIndex = 0,
  options: { title?: string } = {},
): string {
  const title = options.title ?? "";
  const seed = roastSeed(summary, title);
  const intensity = intensityForScore(summary.score);
  const ctx = lineContext(summary, title);

  const opening = pick(OPENINGS[intensity]!, seed, variantIndex)(ctx);

  const top = summary.topPatterns[0];
  let body: string;
  if (!top) {
    body = pick(CLEAN_LINES, seed >>> 3, variantIndex)(ctx);
  } else if (intensity === 1) {
    const line = pick(RULE_LINES[top.ruleId] ?? GENERIC_LINES, seed >>> 5, variantIndex)(ctx);
    body = `${pick(NITPICK_LEADS, seed >>> 3, variantIndex)} ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
  } else {
    const pool = RULE_LINES[top.ruleId] ?? GENERIC_LINES;
    body = pick(pool, seed >>> 5, variantIndex)(ctx);
  }

  const parts = [opening, body];
  const second = summary.topPatterns[1];
  if (intensity >= 3 && second && RULE_LINES[second.ruleId] && second.ruleId !== top?.ruleId) {
    const secondLine = pick(RULE_LINES[second.ruleId]!, seed >>> 7, variantIndex)(
      lineContext(summary, title, 1),
    );
    parts.push(`Also: ${secondLine.charAt(0).toLowerCase()}${secondLine.slice(1)}`);
  } else if (ctx.strength && intensity >= 2 && intensity <= 3) {
    parts.push(pick(CREDIT_LINES, seed >>> 9, variantIndex)(ctx));
  }

  let roastText = parts.join(" ");
  if (roastText.length > 520) {
    roastText = parts.slice(0, 2).join(" ");
  }
  return roastText;
}

export function generateRoastSummary(
  endpoints: NormalizedEndpoint[],
  scoreResult: ApiScoreResult,
  tone: RoastTone = "brutal",
  variantIndex = 0,
  title = "",
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

  const partialSummary = {
    score,
    topPatterns,
    personality,
    strengths,
    totalEndpoints,
    totalFindings,
  };

  const roastText = getRoastTextVariant(partialSummary, variantIndex, { title });
  const verdict = getVerdictByScore(score, roastSeed(partialSummary, title));

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
