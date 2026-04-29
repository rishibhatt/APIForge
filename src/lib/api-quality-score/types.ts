/** Normalized row for scoring (parser output shape). */
export type NormalizedEndpoint = {
  path: string;
  method: string;
  description: string;
  requestBody?: unknown;
  responses?: unknown;
};

export type ApiIssueSeverity = "high" | "medium" | "low";

export type ApiIssueCategory =
  | "naming"
  | "http"
  | "structure"
  | "consistency"
  | "versioning"
  | "errorHandling"
  | "documentation";

export interface ApiIssue {
  type: ApiIssueCategory;
  severity: ApiIssueSeverity;
  message: string;
  example_fix: string;
}

export interface ApiScoreBreakdown {
  naming: number;
  http: number;
  structure: number;
  consistency: number;
  versioning: number;
  errorHandling: number;
  documentation: number;
}

/** Max points per category (sums to 100). */
export const SCORE_CATEGORY_MAX: ApiScoreBreakdown = {
  naming: 20,
  http: 20,
  structure: 15,
  consistency: 15,
  versioning: 10,
  errorHandling: 10,
  documentation: 10,
};

export interface ApiScoreResult {
  totalScore: number;
  breakdown: ApiScoreBreakdown;
  issues: ApiIssue[];
  suggestions: string[];
}
