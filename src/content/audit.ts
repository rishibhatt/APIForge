import type { KnowledgeItem } from "./types";

export interface AuditDiagnosticResult {
  itemId: string;
  slug: string;
  title: string;
  technicalCompleteness: number;
  contentDepth: number;
  internalLinkCoverage: number;
  relatedContentCoverage: number;
  originalityScore: number;
  intentClarityScore: number;
  toolRelevanceScore: number;
  metadataCompleteness: number;
  schemaCompleteness: number;
  overallQualityScore: number;
  warnings: string[];
  passedGates: boolean;
}

export interface CannibalizationCheckResult {
  hasOverlap: boolean;
  overlapLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  existingSlug?: string;
  proposedSlug?: string;
  matchedKeywords: string[];
  recommendation: "KEEP_SEPARATE" | "MERGE" | "UPDATE_EXISTING" | "REVISE_INTENT";
}

export function calculateContentAudit(item: KnowledgeItem): AuditDiagnosticResult {
  const warnings: string[] = [];

  let metadataScore = 100;
  if (!item.seo?.title || item.seo.title.length < 10) {
    metadataScore -= 30;
    warnings.push("Title is missing or too short.");
  }
  if (!item.seo?.description || item.seo.description.length < 50) {
    metadataScore -= 30;
    warnings.push("Meta description is missing or too short.");
  }
  if (!item.keywords || item.keywords.length === 0) {
    metadataScore -= 20;
    warnings.push("No keywords specified.");
  }

  const blockCount = item.blocks?.length || 0;
  const depthScore = Math.min(100, blockCount * 12);
  if (blockCount < 5) {
    warnings.push("Low block count - risk of thin content.");
  }

  let intentClarityScore = 80;
  if (item.answerFirst) {
    intentClarityScore += 20;
  } else {
    warnings.push("Missing Answer-First summary block.");
  }

  const toolRelevanceScore = item.tool ? 100 : 60;

  let schemaCompleteness = 90;
  if (item.faqs && item.faqs.length > 0) schemaCompleteness += 10;

  const overallQualityScore = Math.round(
    metadataScore * 0.25 +
    depthScore * 0.35 +
    intentClarityScore * 0.2 +
    toolRelevanceScore * 0.1 +
    schemaCompleteness * 0.1
  );

  const passedGates = warnings.length === 0 || overallQualityScore >= 70;

  return {
    itemId: item.id,
    slug: item.slug,
    title: item.title,
    technicalCompleteness: 90,
    contentDepth: Math.min(100, depthScore),
    internalLinkCoverage: 85,
    relatedContentCoverage: 90,
    originalityScore: 95,
    intentClarityScore,
    toolRelevanceScore,
    metadataCompleteness: Math.max(0, metadataScore),
    schemaCompleteness: Math.min(100, schemaCompleteness),
    overallQualityScore,
    warnings,
    passedGates,
  };
}

export function detectCannibalization(
  newCandidate: Partial<KnowledgeItem>,
  existingItems: KnowledgeItem[]
): CannibalizationCheckResult {
  if (!newCandidate.slug || !newCandidate.title) {
    return {
      hasOverlap: false,
      overlapLevel: "NONE",
      matchedKeywords: [],
      recommendation: "KEEP_SEPARATE",
    };
  }

  const candidateTitleLower = newCandidate.title.toLowerCase();
  const candidateKeywords = (newCandidate.keywords || []).map((k) => k.toLowerCase());

  for (const item of existingItems) {
    if (item.slug === newCandidate.slug) continue;

    const existingTitleLower = item.title.toLowerCase();
    const existingKeywords = (item.keywords || []).map((k) => k.toLowerCase());

    const titleOverlap = candidateTitleLower === existingTitleLower ||
      (candidateTitleLower.includes(existingTitleLower) || existingTitleLower.includes(candidateTitleLower));

    const matchingKeywords = candidateKeywords.filter((k) => existingKeywords.includes(k));

    if (titleOverlap || matchingKeywords.length >= 3) {
      return {
        hasOverlap: true,
        overlapLevel: "HIGH",
        existingSlug: item.slug,
        proposedSlug: newCandidate.slug,
        matchedKeywords: matchingKeywords,
        recommendation: "UPDATE_EXISTING",
      };
    } else if (matchingKeywords.length >= 1) {
      return {
        hasOverlap: true,
        overlapLevel: "MEDIUM",
        existingSlug: item.slug,
        proposedSlug: newCandidate.slug,
        matchedKeywords: matchingKeywords,
        recommendation: "REVISE_INTENT",
      };
    }
  }

  return {
    hasOverlap: false,
    overlapLevel: "NONE",
    matchedKeywords: [],
    recommendation: "KEEP_SEPARATE",
  };
}
