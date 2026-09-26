import type { ApiIssue, ApiScoreResult, NormalizedEndpoint } from "@/lib/api-quality-score/types";
import type {
  ApiFinding,
  RoastCategory,
  RoastPattern,
  RoastSeverity,
  RoastStrength,
} from "./types";

function mapCategory(issueType: ApiIssue["type"]): RoastCategory {
  switch (issueType) {
    case "naming":
      return "naming";
    case "http":
      return "http-semantics";
    case "structure":
      return "structure";
    case "consistency":
      return "consistency";
    case "versioning":
      return "versioning";
    case "errorHandling":
      return "errors";
    case "documentation":
      return "documentation";
    default:
      return "schema";
  }
}

function deriveRuleId(issue: ApiIssue): string {
  const msg = issue.message.toLowerCase();
  if (msg.includes("camelcase")) return "CAMEL_CASE_PATH";
  if (msg.includes("underscore")) return "UNDERSCORE_PATH";
  if (msg.includes("verb-like segment") || msg.includes("path contains a verb"))
    return "ACTION_IN_PATH";
  if (msg.includes("get requests should not carry a request body"))
    return "GET_WITH_BODY";
  if (msg.includes("verbs in the path often conflict"))
    return "VERB_METHOD_MISMATCH";
  if (msg.includes("deeply nested")) return "DEEP_NESTING";
  if (msg.includes("no successful (2xx) response"))
    return "MISSING_SUCCESS_RESPONSE";
  if (msg.includes("no error responses")) return "MISSING_ERROR_RESPONSE";
  if (msg.includes("no summary or description")) return "UNDOCUMENTED_OPERATIONS";
  if (msg.includes("no url path versioning")) return "MISSING_VERSIONING";
  if (msg.includes("singular") && msg.includes("plural"))
    return "SINGULAR_PLURAL_MIX";
  if (msg.includes("duplicate operation")) return "DUPLICATE_OPERATIONS";
  return `${issue.type.toUpperCase()}_ISSUE`;
}

function extractEndpointFromMessage(msg: string): string | undefined {
  const match = msg.match(/^([A-Z]+\s+\/[^\s:]+)/);
  return match ? match[1] : undefined;
}

export function normalizeFindings(issues: ApiIssue[]): ApiFinding[] {
  return issues.map((issue) => {
    const endpoint = extractEndpointFromMessage(issue.message);
    const ruleId = deriveRuleId(issue);
    const category = mapCategory(issue.type);
    const severity: RoastSeverity =
      issue.severity === "high"
        ? "high"
        : issue.severity === "medium"
          ? "medium"
          : "low";

    return {
      ruleId,
      category,
      severity,
      endpoint,
      evidence: issue.message,
      explanation: issue.message,
      recommendation: issue.example_fix,
    };
  });
}

function severityWeight(sev: RoastSeverity): number {
  switch (sev) {
    case "critical":
      return 1.0;
    case "high":
      return 0.8;
    case "medium":
      return 0.5;
    case "low":
      return 0.2;
  }
}

function ruleHumorPotential(ruleId: string): number {
  switch (ruleId) {
    case "GET_WITH_BODY":
      return 1.0;
    case "ACTION_IN_PATH":
      return 0.95;
    case "VERB_METHOD_MISMATCH":
      return 0.9;
    case "SINGULAR_PLURAL_MIX":
      return 0.85;
    case "MISSING_ERROR_RESPONSE":
      return 0.8;
    case "DEEP_NESTING":
      return 0.75;
    case "DUPLICATE_OPERATIONS":
      return 0.7;
    case "UNDOCUMENTED_OPERATIONS":
      return 0.65;
    case "CAMEL_CASE_PATH":
      return 0.6;
    case "UNDERSCORE_PATH":
      return 0.5;
    case "MISSING_VERSIONING":
      return 0.45;
    case "MISSING_SUCCESS_RESPONSE":
      return 0.4;
    default:
      return 0.5;
  }
}

export function groupAndRankPatterns(
  findings: ApiFinding[],
  totalEndpoints: number,
): RoastPattern[] {
  if (findings.length === 0) return [];

  const groups = new Map<string, ApiFinding[]>();
  for (const finding of findings) {
    const list = groups.get(finding.ruleId) ?? [];
    list.push(finding);
    groups.set(finding.ruleId, list);
  }

  const patterns: RoastPattern[] = [];
  const endpointCount = Math.max(1, totalEndpoints);

  for (const [ruleId, list] of Array.from(groups.entries())) {
    const first = list[0]!;
    const count = list.length;
    const percentage = Math.round((count / endpointCount) * 100);

    // Extract up to 3 distinct representative endpoints
    const repSet = new Set<string>();
    for (const item of list) {
      if (item.endpoint) repSet.add(item.endpoint);
      if (repSet.size >= 3) break;
    }
    const representativeEndpoints = Array.from(repSet);

    const highestSeverity: RoastSeverity = list.some((i) => i.severity === "high")
      ? "high"
      : list.some((i) => i.severity === "medium")
        ? "medium"
        : "low";

    const sevW = severityWeight(highestSeverity);
    const freqW = Math.min(1.0, count / Math.max(1, endpointCount));
    const impactW = Math.min(1.0, count / 5);
    const obviousW = representativeEndpoints.length > 0 ? 0.9 : 0.4;
    const humorW = ruleHumorPotential(ruleId);

    const humorPriority =
      sevW * 0.3 + freqW * 0.25 + impactW * 0.2 + obviousW * 0.15 + humorW * 0.1;

    patterns.push({
      ruleId,
      category: first.category,
      count,
      percentage,
      representativeEndpoints,
      severity: highestSeverity,
      technicalExplanation: first.evidence,
      humorPriority,
    });
  }

  // Sort descending by humor priority
  patterns.sort((a, b) => b.humorPriority - a.humorPriority);
  return patterns;
}

export function extractStrengths(
  endpoints: NormalizedEndpoint[],
  issues: ApiIssue[],
  scoreResult: ApiScoreResult,
): RoastStrength[] {
  const strengths: RoastStrength[] = [];

  const issueRuleIds = new Set(issues.map((i) => deriveRuleId(i)));

  // Check 1: Schema / Response consistency
  if (scoreResult.breakdown.consistency >= 12 && !issueRuleIds.has("SINGULAR_PLURAL_MIX")) {
    strengths.push({
      title: "Consistent Naming Conventions",
      description: "Resource segment naming is surprisingly unified across operations.",
      ruleId: "CONSISTENT_NAMING",
    });
  }

  // Check 2: Versioning
  if (!issueRuleIds.has("MISSING_VERSIONING")) {
    strengths.push({
      title: "Explicit API Versioning",
      description: "URL path version segments (e.g. /v1) are present and properly structured.",
      ruleId: "VERSIONING_PRESENT",
    });
  }

  // Check 3: Documentation
  if (scoreResult.breakdown.documentation >= 8 || !issueRuleIds.has("UNDOCUMENTED_OPERATIONS")) {
    strengths.push({
      title: "Documented Operation Intent",
      description: "Operations include helpful summaries and descriptions for consumers.",
      ruleId: "DOCS_PRESENT",
    });
  }

  // Check 4: Clean HTTP GET semantics
  if (!issueRuleIds.has("GET_WITH_BODY")) {
    strengths.push({
      title: "Pure GET Semantics",
      description: "GET requests don't sneak payloads into request bodies.",
      ruleId: "PURE_GET",
    });
  }

  // Check 5: Standard error responses declared
  if (!issueRuleIds.has("MISSING_ERROR_RESPONSE") && scoreResult.breakdown.errorHandling >= 7) {
    strengths.push({
      title: "Structured Error Declarations",
      description: "4xx and 5xx error responses are explicitly modeled.",
      ruleId: "ERRORS_DECLARED",
    });
  }

  // Restrained fallback if no specific strengths were found
  if (strengths.length === 0) {
    if (endpoints.length > 0) {
      strengths.push({
        title: "It Actually Responds",
        description: "The specification loads without crashing the parser. That's a foundation.",
        ruleId: "RESPONDS",
      });
    }
  }

  return strengths.slice(0, 3);
}
