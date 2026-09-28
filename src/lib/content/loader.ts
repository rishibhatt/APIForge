import type { Article, GlossaryEntry, OpenApiExample, Comparison, KnowledgeItem } from "@/content/types";
import {
  contentRegistry,
  getKnowledgeItemBySlug,
  getKnowledgeItemsByCluster,
  getKnowledgeItemsByType,
  getRelatedContentGraph,
} from "@/content/registry";

export function getAllGuides(): Article[] {
  return contentRegistry.guides as Article[];
}

export function getFeaturedGuides(): Article[] {
  return contentRegistry.guides.filter((g) => g.featured) as Article[];
}

export function getGuideBySlug(slug: string): Article | undefined {
  return contentRegistry.guides.find((g) => g.slug === slug) as Article | undefined;
}

export function getAllGlossary(): GlossaryEntry[] {
  return contentRegistry.glossary.map((item) => {
    const codeBlock = item.blocks.find((b) => b.type === "code") as { language: string; code: string; caption?: string } | undefined;
    return {
      slug: item.slug,
      term: item.title.replace(/^What is\s+/i, "").replace(/\?$/, ""),
      definition: item.description,
      category: item.category,
      detailedExplanation: item.blocks.find((b) => b.type === "paragraph")?.text || item.description,
      codeExample: codeBlock,
      commonMistakes: item.mistakes || [],
      relatedTerms: [],
      relatedToolHref: item.tool?.href,
      relatedToolTitle: item.tool?.title,
      faqs: item.faqs,
      publishedAt: item.publishedAt,
      updatedAt: item.updatedAt,
    };
  });
}

export function getGlossaryBySlug(slug: string): GlossaryEntry | undefined {
  const item = contentRegistry.glossary.find((e) => e.slug === slug);
  if (!item) return undefined;
  return getAllGlossary().find((g) => g.slug === slug);
}

export function getAllExamples(): OpenApiExample[] {
  return contentRegistry.examples.map((item) => {
    const badBlock = item.blocks.find((b) => b.type === "badExample") as { code: string; language: string; explanation: string } | undefined;
    const goodBlock = item.blocks.find((b) => b.type === "goodExample") as { code: string; language: string; explanation: string } | undefined;
    const checklistBlock = item.blocks.find((b) => b.type === "checklist") as { items?: Array<{ text: string }> } | undefined;

    return {
      slug: item.slug,
      title: item.title,
      description: item.description,
      category: item.category,
      problemStatement: item.blocks.find((b) => b.type === "paragraph")?.text || item.description,
      badExample: {
        code: badBlock?.code || "",
        language: badBlock?.language || "yaml",
        explanation: badBlock?.explanation || "",
      },
      goodExample: {
        code: goodBlock?.code || "",
        language: goodBlock?.language || "yaml",
        explanation: goodBlock?.explanation || "",
      },
      apiforgeChecks: checklistBlock?.items?.map((i) => i.text) || [],
      publishedAt: item.publishedAt,
      updatedAt: item.updatedAt,
    };
  });
}

export function getExampleBySlug(slug: string): OpenApiExample | undefined {
  return getAllExamples().find((e) => e.slug === slug);
}

export function getAllComparisons(): Comparison[] {
  return contentRegistry.comparisons.map((item) => {
    const compBlock = item.blocks.find((b) => b.type === "comparison") as { rows?: Array<[string, string, string]> } | undefined;
    const infoCallout = item.blocks.find((b) => b.type === "callout") as { text: string } | undefined;

    return {
      slug: item.slug,
      title: item.title,
      description: item.description,
      competitorName: item.title.split(" vs ")[1] || "Competitor",
      heroSubtitle: item.description,
      verdict: infoCallout?.text || item.description,
      featuresTable: compBlock?.rows?.map((r) => ({
        feature: r[0],
        apiforge: r[1],
        competitor: r[2],
      })) || [],
      sections: [],
      faqs: item.faqs,
      publishedAt: item.publishedAt,
      updatedAt: item.updatedAt,
    };
  });
}

export function getComparisonBySlug(slug: string): Comparison | undefined {
  return getAllComparisons().find((c) => c.slug === slug);
}

export function getAllChecklists(): KnowledgeItem[] {
  return contentRegistry.checklists;
}

export function getChecklistBySlug(slug: string): KnowledgeItem | undefined {
  return contentRegistry.checklists.find((c) => c.slug === slug);
}

export function getAllReferences(): KnowledgeItem[] {
  return contentRegistry.reference;
}

export function getReferenceBySlug(slug: string): KnowledgeItem | undefined {
  return contentRegistry.reference.find((r) => r.slug === slug);
}

export {
  contentRegistry,
  getKnowledgeItemBySlug,
  getKnowledgeItemsByCluster,
  getKnowledgeItemsByType,
  getRelatedContentGraph,
};

export function getRelatedContent(currentSlug: string) {
  const graph = getRelatedContentGraph(currentSlug);
  return {
    guides: graph.guides as Article[],
    glossary: graph.glossary ? getGlossaryBySlug(graph.glossary.slug) : getAllGlossary()[0],
    example: graph.example ? getExampleBySlug(graph.example.slug) : getAllExamples()[0],
  };
}
