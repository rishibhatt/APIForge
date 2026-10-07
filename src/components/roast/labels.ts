import type { RoastSeverity, RoastStatusTier } from "@/lib/roast/types";

const CATEGORY_LABELS: Record<string, string> = {
  naming: "Naming",
  "http-semantics": "HTTP semantics",
  http: "HTTP semantics",
  structure: "Structure",
  consistency: "Consistency",
  versioning: "Versioning",
  errors: "Error handling",
  errorHandling: "Error handling",
  documentation: "Documentation",
  schema: "Schema",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Points available per scoring category (mirrors the deterministic scoring engine). */
export const CATEGORY_MAX: Record<string, number> = {
  naming: 20,
  http: 20,
  structure: 15,
  consistency: 15,
  versioning: 10,
  errorHandling: 10,
  documentation: 10,
};

export const TIER_LABELS: Record<RoastStatusTier, string> = {
  HEALTHY: "Healthy",
  QUESTIONABLE: "Questionable",
  CHAOTIC: "Chaotic",
  CRIMINAL: "Criminal",
  NUCLEAR: "Nuclear",
};

export type Tone = "ok" | "warn" | "bad";

export function tierTone(tier: RoastStatusTier): Tone {
  if (tier === "HEALTHY") return "ok";
  if (tier === "QUESTIONABLE") return "warn";
  return "bad";
}

export function tierFromScore(score: number): RoastStatusTier {
  if (score >= 85) return "HEALTHY";
  if (score >= 70) return "QUESTIONABLE";
  if (score >= 55) return "CHAOTIC";
  if (score >= 40) return "CRIMINAL";
  return "NUCLEAR";
}

export function severityTone(severity: RoastSeverity): Tone {
  if (severity === "critical" || severity === "high") return "bad";
  if (severity === "medium") return "warn";
  return "ok";
}

export const SEVERITY_LABELS: Record<RoastSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** "Pure GET Semantics" -> "Pure GET semantics": sentence case that keeps acronyms. */
export function sentenceCase(text: string): string {
  return text
    .split(" ")
    .map((word, i) => (i === 0 || /^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(" ");
}
