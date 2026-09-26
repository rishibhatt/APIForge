import type { ApiScoreResult, NormalizedEndpoint } from "@/lib/api-quality-score/types";

export type RoastPersonality =
  | "CHAOTIC"
  | "CONFUSED"
  | "QUESTIONABLE"
  | "SURVIVOR"
  | "OVERENGINEERED"
  | "SILENT_API"
  | "CLEAN_API"
  | "PERFECTIONIST";

export function classifyPersonality(
  endpoints: NormalizedEndpoint[],
  scoreResult: ApiScoreResult,
): RoastPersonality {
  const score = scoreResult.totalScore;
  const issues = scoreResult.issues;
  const issueTypes = new Set(issues.map((i) => i.type));

  const undocCount = issues.filter(
    (i) => i.message.includes("summary") || i.message.includes("description"),
  ).length;

  const namingCount = issues.filter((i) => i.type === "naming").length;
  const httpCount = issues.filter((i) => i.type === "http").length;
  const structCount = issues.filter((i) => i.type === "structure").length;

  const totalOps = Math.max(1, endpoints.length);

  // 1. Clean / Perfectionist
  if (score >= 90) return "PERFECTIONIST";
  if (score >= 82) return "CLEAN_API";

  // 2. Silent API (high documentation issues)
  if (undocCount / totalOps > 0.35 || scoreResult.breakdown.documentation < 4) {
    return "SILENT_API";
  }

  // 3. Chaotic (multiple naming / consistency violations)
  if (namingCount >= 3 || issueTypes.has("consistency")) {
    return "CHAOTIC";
  }

  // 4. Overengineered (deep nesting / structure penalties)
  if (structCount >= 2 || scoreResult.breakdown.structure < 7) {
    return "OVERENGINEERED";
  }

  // 5. Confused (mixed HTTP verbs / action paths)
  if (httpCount >= 2) {
    return "CONFUSED";
  }

  // 6. Questionable vs Survivor
  if (score < 45) return "QUESTIONABLE";
  return "SURVIVOR";
}
