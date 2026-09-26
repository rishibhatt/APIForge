export type ContentCategory =
  | "api-design"
  | "openapi"
  | "swagger"
  | "api-testing"
  | "api-security"
  | "api-documentation"
  | "developer-tools";

export interface Author {
  name: string;
  role: string;
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
  | "tool"
  | "cta"
  | "image";

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

export interface ToolBlock {
  type: "tool";
  tool: "api-score" | "openapi-validator" | "swagger-validator" | "api-testing" | "roast-my-api";
  title: string;
  description: string;
  buttonText: string;
  href: string;
}

export interface ImageBlock {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | CodeBlock
  | QuoteBlock
  | ListBlock
  | CalloutBlock
  | TableBlock
  | ToolBlock
  | ImageBlock;

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: ContentCategory;
  tags: string[];
  keywords: string[];
  author: string; // author key e.g. "rishab"
  publishedAt: string;
  updatedAt?: string;
  readingTime?: string;
  heroImage?: string;
  ogImage?: string;
  canonicalUrl?: string;
  featured?: boolean;
  content: ContentBlock[];
  faqs?: FAQItem[];
}

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
