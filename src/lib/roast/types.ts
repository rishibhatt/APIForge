export type RoastSeverity = "critical" | "high" | "medium" | "low";

export type RoastCategory =
  | "naming"
  | "http-semantics"
  | "structure"
  | "consistency"
  | "versioning"
  | "errors"
  | "documentation"
  | "schema";

export type RoastTone = "professional" | "brutal" | "nuclear";

export type RoastStatusTier =
  | "HEALTHY"
  | "QUESTIONABLE"
  | "CHAOTIC"
  | "CRIMINAL"
  | "NUCLEAR";

export type RoastPersonality =
  | "CHAOTIC"
  | "CONFUSED"
  | "QUESTIONABLE"
  | "SURVIVOR"
  | "OVERENGINEERED"
  | "SILENT_API"
  | "CLEAN_API"
  | "PERFECTIONIST";

export interface ApiFinding {
  ruleId: string;
  category: RoastCategory;
  severity: RoastSeverity;
  endpoint?: string;
  evidence: string;
  explanation: string;
  recommendation: string;
}

export interface RoastPattern {
  ruleId: string;
  category: RoastCategory;
  count: number;
  percentage: number;
  representativeEndpoints: string[];
  severity: RoastSeverity;
  technicalExplanation: string;
  humorPriority: number;
}

export interface RoastStrength {
  title: string;
  description: string;
  ruleId?: string;
}

export interface RoastSummary {
  score: number;
  statusTier: RoastStatusTier;
  totalEndpoints: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  categoryBreakdown: {
    category: string;
    count: number;
  }[];
  topPatterns: RoastPattern[];
  strengths: RoastStrength[];
  personality?: RoastPersonality;
  roast: string;
  verdict: string;
  characterCount: number;
  tone: RoastTone;
  meme?: {
    id: string;
    src: string;
    caption: string;
    mood: string;
  };
}

export interface SanitizedRoastReport {
  id: string;
  createdAt: number;
  title: string;
  version?: string;
  specUrl?: string;
  summary: RoastSummary;
  endpointsCount: number;
  score: number;
  breakdown: Record<string, number>;
  suggestions: string[];
}
