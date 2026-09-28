export type ContentType =
  | "guide"
  | "glossary"
  | "example"
  | "comparison"
  | "checklist"
  | "reference"
  | "tool-guide";

export type ContentCategory =
  | "api-design"
  | "openapi"
  | "swagger"
  | "api-testing"
  | "api-security"
  | "api-documentation"
  | "developer-tools";

export type ContentCluster =
  | "openapi"
  | "rest-api"
  | "api-security"
  | "api-testing"
  | "api-documentation"
  | "api-versioning"
  | "api-errors"
  | "api-performance"
  | "api-reliability"
  | "api-governance"
  | "api-quality"
  | "http"
  | "json-schema"
  | "developer-experience";

export type SearchIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational";

export type TargetAudience =
  | "frontend-dev"
  | "backend-dev"
  | "api-architect"
  | "devops"
  | "tech-lead"
  | "all-developers";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export interface Author {
  id?: string;
  name: string;
  role?: string;
  avatar?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  x?: string;
  bio?: string;
}

export type BlockType =
  | "paragraph"
  | "heading"
  | "code"
  | "quote"
  | "list"
  | "callout"
  | "table"
  | "comparison"
  | "checklist"
  | "steps"
  | "example"
  | "badExample"
  | "goodExample"
  | "decisionTree"
  | "quote"
  | "image"
  | "diagram"
  | "tool"
  | "cta"
  | "faq"
  | "relatedContent"
  | "externalReference"
  | "summary"
  | "warning"
  | "tip";

export interface ParagraphBlock {
  type: "paragraph";
  text: string;
}

export interface HeadingBlock {
  type: "heading";
  level: 2 | 3 | 4;
  text: string;
  id?: string;
}

export interface CodeBlock {
  type: "code";
  language: string;
  code: string;
  filename?: string;
  caption?: string;
}

export interface QuoteBlock {
  type: "quote";
  text: string;
  author?: string;
}

export interface ListBlock {
  type: "list";
  ordered?: boolean;
  items: string[];
}

export interface CalloutBlock {
  type: "callout";
  variant?: "info" | "warning" | "tip" | "danger";
  title?: string;
  text: string;
}

export interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface ComparisonBlock {
  type: "comparison";
  title?: string;
  headers: [string, string, string];
  rows: Array<[string, string, string]>;
}

export interface ChecklistBlock {
  type: "checklist";
  title?: string;
  items: Array<{ text: string; done?: boolean; detail?: string }>;
}

export interface StepsBlock {
  type: "steps";
  title?: string;
  steps: Array<{ title: string; description: string; code?: string }>;
}

export interface CodeExampleBlock {
  type: "example" | "badExample" | "goodExample";
  title: string;
  language: string;
  code: string;
  explanation: string;
}

export interface DecisionTreeBlock {
  type: "decisionTree";
  title: string;
  description?: string;
  nodes: Array<{
    condition: string;
    recommendation: string;
    alternative?: string;
  }>;
}

export interface ImageBlock {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
}

export interface DiagramBlock {
  type: "diagram";
  title: string;
  description?: string;
  mermaidSyntax?: string;
  asciiArt?: string;
}

export interface ToolBlock {
  type: "tool" | "cta";
  tool?: "api-score" | "openapi-validator" | "swagger-validator" | "api-testing" | "roast-my-api" | "api-quality-checker";
  title: string;
  description: string;
  buttonText: string;
  href: string;
}

export interface FaqBlock {
  type: "faq";
  faqs: FAQItem[];
}

export interface RelatedContentBlock {
  type: "relatedContent";
  slugs: string[];
}

export interface ExternalReferenceBlock {
  type: "externalReference";
  title: string;
  url: string;
  source: string;
}

export interface SummaryBlock {
  type: "summary" | "tip" | "warning";
  title: string;
  text: string;
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | CodeBlock
  | QuoteBlock
  | ListBlock
  | CalloutBlock
  | TableBlock
  | ComparisonBlock
  | ChecklistBlock
  | StepsBlock
  | CodeExampleBlock
  | DecisionTreeBlock
  | ImageBlock
  | DiagramBlock
  | ToolBlock
  | FaqBlock
  | RelatedContentBlock
  | ExternalReferenceBlock
  | SummaryBlock;

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ExternalReference {
  title: string;
  url: string;
  source: string;
}

export interface SEOConfig {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl?: string;
  noindex?: boolean;
  ogType?: "website" | "article";
}

export interface KnowledgeItem {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  description: string;
  excerpt?: string;
  cluster: ContentCluster;
  pillar?: string;
  category: ContentCategory;
  subcategory?: string;
  primaryIntent: SearchIntent;
  audience: TargetAudience;
  difficulty: DifficultyLevel;
  publishedAt: string;
  updatedAt?: string;
  readingTime?: string;
  author: string; // Author ID or name e.g. "rishab"
  blocks: ContentBlock[];
  
  // Optional enhancement sections
  answerFirst?: string;
  keyTakeaways?: string[];
  checklist?: string[];
  mistakes?: string[];
  faqs?: FAQItem[];
  references?: ExternalReference[];
  tool?: {
    href: string;
    title: string;
    buttonText: string;
  };
  canonical?: string;
  heroImage?: string;
  shareImage?: string;
  featured?: boolean;
  seo?: SEOConfig;
  tags?: string[];
  keywords?: string[];
}

// Backward-compatibility type aliases
export type Article = KnowledgeItem;

export interface GlossaryEntry {
  slug: string;
  term: string;
  definition: string;
  category: ContentCategory;
  detailedExplanation: string;
  codeExample?: {
    language: string;
    code: string;
    caption?: string;
  };
  commonMistakes: string[];
  relatedTerms: string[];
  relatedToolHref?: string;
  relatedToolTitle?: string;
  faqs?: FAQItem[];
  publishedAt: string;
  updatedAt?: string;
}

export interface OpenApiExample {
  slug: string;
  title: string;
  description: string;
  category: ContentCategory;
  problemStatement: string;
  badExample: {
    code: string;
    language: string;
    explanation: string;
  };
  goodExample: {
    code: string;
    language: string;
    explanation: string;
  };
  apiforgeChecks: string[];
  relatedGuides?: string[];
  publishedAt: string;
  updatedAt?: string;
}

export interface ComparisonFeature {
  feature: string;
  apiforge: string;
  competitor: string;
  notes?: string;
}

export interface ComparisonSection {
  title: string;
  description: string;
  apiforgeWay: string;
  competitorWay: string;
}

export interface Comparison {
  slug: string;
  title: string;
  description: string;
  competitorName: string;
  heroSubtitle: string;
  verdict: string;
  featuresTable: ComparisonFeature[];
  sections: ComparisonSection[];
  faqs?: FAQItem[];
  publishedAt: string;
  updatedAt?: string;
}
