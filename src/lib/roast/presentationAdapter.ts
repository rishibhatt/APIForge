import type { RoastCategory, RoastPattern, RoastSeverity, RoastSummary } from "./types";

export interface RoastOffence {
  rank: number;
  category: RoastCategory | string;
  title: string;
  funnySummary: string;
  count: number;
  affectedPercentage: number;
  severity: RoastSeverity;
  explanation: string;
  whyItMatters: string;
  endpoints: {
    method: string;
    path: string;
  }[];
  ruleId: string;
  suggestedFix: string;
}

export interface DamageMetrics {
  totalIssues: number;
  problemTypesCount: number;
  affectedEndpointsCount: number;
  affectedPercentage: number;
}

export interface CategoryHeatmapItem {
  category: string;
  count: number;
  percentage: number;
}

export interface RoastPresentationData {
  metrics: DamageMetrics;
  heatmap: CategoryHeatmapItem[];
  offences: RoastOffence[];
}

const CATEGORY_FUNNY_SUMMARIES: Record<string, string> = {
  naming: "Your endpoints are having an identity crisis.",
  "http-semantics": "HTTP methods have officially entered the chat.",
  errors: "Error handling is playing hide and seek.",
  documentation: "The documentation disappearing act.",
  versioning: "API versioning archaeology in action.",
  structure: "Payload schemas going rogue.",
  consistency: "Consistency rules were treated as optional guidelines.",
  schema: "Schema validation encountered unexpected turbulence.",
};

const CATEGORY_WHY_IT_MATTERS: Record<string, string> = {
  naming: "Resource-oriented noun paths make APIs intuitive, predictable, and easy to cache.",
  "http-semantics": "Misusing GET bodies or returning 200 OK for failures breaks HTTP proxies, SDK generators, and client error handling.",
  errors: "Unmodeled 500 error strings and missing 4xx schemas force client developers to guess failure modes.",
  documentation: "Undocumented endpoints lead to integration guesswork, broken client code, and hidden security risks.",
  versioning: "Inconsistent version paths make breaking changes unpredictable for downstream API consumers.",
  structure: "Deeply nested or un-typed schema properties lead to runtime deserialization crashes.",
  consistency: "Mixing casing formats (camelCase, snake_case, kebab-case) confuses frontend developers and typed SDKs.",
  schema: "Malformed payload schemas trigger unexpected validation exceptions in API gateways.",
};

const CATEGORY_SUGGESTIONS: Record<string, string> = {
  naming: "Use plural nouns for resources (e.g., /users instead of /getUsers).",
  "http-semantics": "Return appropriate 4xx/5xx status codes and remove body payloads from GET operations.",
  errors: "Define standard RFC 7807 Problem Details response schemas for all 4xx/5xx errors.",
  documentation: "Add concise operation summaries and field descriptions across all spec endpoints.",
  versioning: "Consolidate versioning into standard URL paths (e.g. /v1/resource) or headers.",
  structure: "Simplify payload nesting and explicitly define array item schemas.",
};

function parseEndpointString(ep: string): { method: string; path: string } {
  const parts = ep.trim().split(/\s+/);
  if (parts.length >= 2) {
    return {
      method: parts[0]!.toUpperCase(),
      path: parts.slice(1).join(" "),
    };
  }
  return {
    method: "GET",
    path: ep,
  };
}

export function adaptRoastSummaryToPresentation(summary: RoastSummary): RoastPresentationData {
  const totalIssues = summary.totalFindings;
  const problemTypesCount = summary.categoryBreakdown.length || summary.topPatterns.length;
  const totalEndpoints = Math.max(1, summary.totalEndpoints);

  // Compute unique endpoints affected across patterns
  const affectedSet = new Set<string>();
  for (const pattern of summary.topPatterns) {
    for (const ep of pattern.representativeEndpoints) {
      affectedSet.add(ep);
    }
  }
  const affectedEndpointsCount = Math.min(totalEndpoints, affectedSet.size || Math.ceil(totalEndpoints * 0.4));
  const affectedPercentage = Math.min(100, Math.round((affectedEndpointsCount / totalEndpoints) * 100));

  const metrics: DamageMetrics = {
    totalIssues,
    problemTypesCount,
    affectedEndpointsCount,
    affectedPercentage,
  };

  // Build heatmap distribution
  const totalBreakdownCount = summary.categoryBreakdown.reduce((sum, item) => sum + item.count, 0) || 1;
  const heatmap: CategoryHeatmapItem[] = summary.categoryBreakdown
    .map((item) => ({
      category: item.category,
      count: item.count,
      percentage: Math.min(100, Math.round((item.count / totalBreakdownCount) * 100)),
    }))
    .sort((a, b) => b.count - a.count);

  // Build ranked offences
  const offences: RoastOffence[] = summary.topPatterns.map((pattern: RoastPattern, idx: number) => {
    const cat = pattern.category;
    const funnySummary = CATEGORY_FUNNY_SUMMARIES[cat] || `Architectural offence detected in ${cat}.`;
    const whyItMatters = CATEGORY_WHY_IT_MATTERS[cat] || "This issue reduces API maintainability and developer experience.";
    const suggestedFix = CATEGORY_SUGGESTIONS[cat] || "Refactor endpoint to adhere to standard OpenAPI specifications.";

    const endpoints = pattern.representativeEndpoints.map(parseEndpointString);

    return {
      rank: idx + 1,
      category: cat,
      title: pattern.category.toUpperCase().replace("-", " "),
      funnySummary,
      count: pattern.count,
      affectedPercentage: Math.min(100, pattern.percentage || Math.round((pattern.count / totalEndpoints) * 100)),
      severity: pattern.severity || (pattern.count > 5 ? "high" : "medium"),
      explanation: pattern.technicalExplanation,
      whyItMatters,
      endpoints,
      ruleId: pattern.ruleId,
      suggestedFix,
    };
  });

  return {
    metrics,
    heatmap,
    offences,
  };
}
