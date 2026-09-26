import { describe, it } from "node:test";
import assert from "node:assert";
import type { NormalizedEndpoint, ApiIssue, ApiScoreResult } from "@/lib/api-quality-score/types";
import { normalizeFindings, groupAndRankPatterns } from "../aggregateFindings";
import { generateRoastSummary } from "../generateRoast";
import { sanitizeRoastReport, sanitizeUrl } from "../sanitizeReport";
import type { SanitizedRoastReport } from "../types";

describe("Roast My API Engine — Finding Adapter & Aggregation", () => {
  it("should normalize raw ApiIssues into ApiFindings", () => {
    const issues: ApiIssue[] = [
      {
        type: "naming",
        severity: "high",
        message: "GET /getUser: Path contains a verb-like segment \"get\"; resources should be nouns.",
        example_fix: "Use DELETE /users/{id}",
      },
    ];

    const findings = normalizeFindings(issues);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0]?.ruleId, "ACTION_IN_PATH");
    assert.strictEqual(findings[0]?.category, "naming");
    assert.strictEqual(findings[0]?.severity, "high");
    assert.strictEqual(findings[0]?.endpoint, "GET /getUser");
  });

  it("should aggregate 500 duplicate findings into concise RoastPatterns", () => {
    const issues: ApiIssue[] = [];
    for (let i = 0; i < 500; i++) {
      issues.push({
        type: "naming",
        severity: "high",
        message: `GET /getUser${i}: Path contains a verb-like segment "get"; resources should be nouns.`,
        example_fix: "Use nouns",
      });
    }

    const findings = normalizeFindings(issues);
    const patterns = groupAndRankPatterns(findings, 500);

    assert.strictEqual(patterns.length, 1);
    assert.strictEqual(patterns[0]?.ruleId, "ACTION_IN_PATH");
    assert.strictEqual(patterns[0]?.count, 500);
    assert.strictEqual(patterns[0]?.representativeEndpoints.length, 3);
  });
});

describe("Roast My API Engine — Roast Generation & Character Limit", () => {
  const sampleEndpoints: NormalizedEndpoint[] = Array.from({ length: 50 }, (_, i) => ({
    path: `/v1/getUsers${i}`,
    method: "GET",
    description: "",
  }));

  const sampleScoreResult: ApiScoreResult = {
    totalScore: 43,
    breakdown: {
      naming: 5,
      http: 10,
      structure: 10,
      consistency: 5,
      versioning: 5,
      errorHandling: 4,
      documentation: 4,
    },
    issues: [
      {
        type: "naming",
        severity: "high",
        message: "GET /v1/getUsers: Path contains a verb-like segment \"get\"; resources should be nouns.",
        example_fix: "Use nouns",
      },
      {
        type: "http",
        severity: "high",
        message: "GET /v1/getUsers: GET requests should not carry a request body.",
        example_fix: "Remove request body",
      },
      {
        type: "documentation",
        severity: "low",
        message: "GET /v1/getUsers: Operation has no summary or description.",
        example_fix: "Add description",
      },
    ],
    suggestions: ["Use plural nouns for collections."],
  };

  it("should generate concise roast text within character limits (<= 1000 chars)", () => {
    const summary = generateRoastSummary(sampleEndpoints, sampleScoreResult, "brutal");
    assert.ok(summary.roast.length <= 1000, `Roast length was ${summary.roast.length}`);
    assert.strictEqual(summary.score, 43);
    assert.ok(summary.verdict.length > 0);
  });

  it("should handle clean APIs (score >= 90) with positive humor", () => {
    const cleanEndpoints: NormalizedEndpoint[] = [
      { path: "/v1/users", method: "GET", description: "Get users" },
    ];
    const cleanResult: ApiScoreResult = {
      totalScore: 98,
      breakdown: {
        naming: 20,
        http: 20,
        structure: 15,
        consistency: 15,
        versioning: 10,
        errorHandling: 9,
        documentation: 9,
      },
      issues: [],
      suggestions: [],
    };

    const summary = generateRoastSummary(cleanEndpoints, cleanResult, "brutal");
    assert.strictEqual(summary.score, 98);
    assert.ok(summary.roast.includes("0 design issues") || summary.roast.includes("Annoyingly clean") || summary.roast.includes("clean"));
  });

  it("should handle large specs (5000 endpoints) without crashing", () => {
    const largeEndpoints: NormalizedEndpoint[] = Array.from({ length: 5000 }, (_, i) => ({
      path: `/api/v1/resource${i}`,
      method: "GET",
      description: `Description ${i}`,
    }));

    const summary = generateRoastSummary(largeEndpoints, sampleScoreResult, "nuclear");
    assert.strictEqual(summary.totalEndpoints, 5000);
    assert.ok(summary.roast.length <= 1000);
  });
});

describe("Roast My API Engine — Security & Redaction", () => {
  it("should sanitize sensitive credentials from URLs", () => {
    const rawUrl = "https://api.example.com/v1/openapi.json?api_key=secret123&token=xyz";
    const sanitized = sanitizeUrl(rawUrl);
    assert.strictEqual(sanitized.includes("secret123"), false);
    assert.strictEqual(sanitized.includes("REDACTED"), true);
  });

  it("should sanitize reports and remove sensitive information", () => {
    const rawReport: SanitizedRoastReport = {
      id: "rst_123",
      createdAt: Date.now(),
      title: "Private API key=secret123",
      specUrl: "https://api.example.com?token=supersecret",
      summary: {
        score: 50,
        statusTier: "CHAOTIC",
        totalEndpoints: 10,
        totalFindings: 2,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 1,
        lowCount: 0,
        categoryBreakdown: [],
        topPatterns: [
          {
            ruleId: "ACTION_IN_PATH",
            category: "naming",
            count: 1,
            percentage: 10,
            representativeEndpoints: ["GET /getUser?token=supersecret"],
            severity: "high",
            technicalExplanation: "Path contains verb",
            humorPriority: 1,
          },
        ],
        strengths: [],
        roast: "Test roast",
        verdict: "Test verdict",
        characterCount: 10,
        tone: "brutal",
      },
      endpointsCount: 10,
      score: 50,
      breakdown: {},
      suggestions: [],
    };

    const sanitized = sanitizeRoastReport(rawReport);
    assert.strictEqual(sanitized.title.includes("secret123"), false);
    assert.strictEqual(sanitized.specUrl?.includes("supersecret"), false);
    assert.strictEqual(sanitized.summary.topPatterns[0]?.representativeEndpoints[0]?.includes("supersecret"), false);
  });
});
