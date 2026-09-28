import type {
  KnowledgeItem,
  ContentType,
  ContentCategory,
  ContentCluster,
  ContentBlock,
} from "./types";
import { CANONICAL_AUTHOR } from "./authors";
import { CLUSTERS_REGISTRY } from "./clusters";

// Legacy JSON imports
import openapiBestPractices from "@/content/guides/openapi-best-practices.json";
import restApiDesignBestPractices from "@/content/guides/rest-api-design-best-practices.json";
import swaggerVsOpenapi from "@/content/guides/swagger-vs-openapi.json";
import validateSwaggerOpenapiSpec from "@/content/guides/validate-swagger-openapi-spec.json";
import apiVersioningBestPractices from "@/content/guides/api-versioning-best-practices.json";
import restApiErrorHandling from "@/content/guides/rest-api-error-handling.json";
import apiNamingConventions from "@/content/guides/api-naming-conventions.json";
import openapiResponseSchemaBestPractices from "@/content/guides/openapi-response-schema-best-practices.json";
import apiDocumentationBestPractices from "@/content/guides/api-documentation-best-practices.json";
import apiSecurityBestPractices from "@/content/guides/api-security-best-practices.json";
import apiPaginationBestPractices from "@/content/guides/api-pagination-best-practices.json";
import apiRateLimitingBestPractices from "@/content/guides/api-rate-limiting-best-practices.json";
import apiTestingBestPractices from "@/content/guides/api-testing-best-practices.json";
import commonOpenapiErrors from "@/content/guides/common-openapi-errors.json";
import apiQualityChecklist from "@/content/guides/api-quality-checklist.json";

// Glossary imports
import openapiGlossary from "@/content/glossary/openapi.json";
import swaggerGlossary from "@/content/glossary/swagger.json";
import restApiGlossary from "@/content/glossary/rest-api.json";
import jsonSchemaGlossary from "@/content/glossary/json-schema.json";
import apiContractGlossary from "@/content/glossary/api-contract.json";
import apiVersioningGlossary from "@/content/glossary/api-versioning.json";
import idempotencyGlossary from "@/content/glossary/idempotency.json";
import paginationGlossary from "@/content/glossary/pagination.json";
import rateLimitingGlossary from "@/content/glossary/rate-limiting.json";
import oauthGlossary from "@/content/glossary/oauth.json";
import bearerTokenGlossary from "@/content/glossary/bearer-token.json";
import httpStatusCodeGlossary from "@/content/glossary/http-status-code.json";
import apiGatewayGlossary from "@/content/glossary/api-gateway.json";
import schemaValidationGlossary from "@/content/glossary/schema-validation.json";
import apiDocumentationGlossary from "@/content/glossary/api-documentation.json";

// Examples imports
import goodOpenapiExample from "@/content/examples/good-openapi-example.json";
import badOpenapiExample from "@/content/examples/bad-openapi-example.json";
import openapiErrorResponseExample from "@/content/examples/openapi-error-response-example.json";
import openapiPaginationExample from "@/content/examples/openapi-pagination-example.json";
import openapiAuthenticationExample from "@/content/examples/openapi-authentication-example.json";

// Comparison imports
import apiforgeVsSpectral from "@/content/comparisons/apiforge-vs-spectral.json";
import apiforgeVsSwaggerEditor from "@/content/comparisons/apiforge-vs-swagger-editor.json";
import apiforgeVsPostman from "@/content/comparisons/apiforge-vs-postman.json";

interface RawArticleData {
  slug: string;
  title: string;
  description: string;
  excerpt?: string;
  category?: string;
  publishedAt?: string;
  updatedAt?: string;
  readingTime?: string;
  author?: string;
  content: ContentBlock[];
  faqs?: Array<{ question: string; answer: string }>;
  featured?: boolean;
  keywords?: string[];
  tags?: string[];
}

interface RawGlossaryData {
  slug: string;
  term: string;
  definition: string;
  category?: string;
  detailedExplanation: string;
  codeExample?: { language: string; code: string; caption?: string };
  commonMistakes?: string[];
  relatedToolHref?: string;
  relatedToolTitle?: string;
  faqs?: Array<{ question: string; answer: string }>;
  publishedAt?: string;
  updatedAt?: string;
}

interface RawExampleData {
  slug: string;
  title: string;
  description: string;
  category?: string;
  problemStatement: string;
  badExample: { code: string; language: string; explanation: string };
  goodExample: { code: string; language: string; explanation: string };
  apiforgeChecks?: string[];
  publishedAt?: string;
  updatedAt?: string;
}

interface RawComparisonData {
  slug: string;
  title: string;
  description: string;
  competitorName: string;
  verdict: string;
  featuresTable: Array<{ feature: string; apiforge: string; competitor: string }>;
  sections: Array<{ title: string; apiforgeWay: string; competitorWay: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  publishedAt?: string;
  updatedAt?: string;
}

function convertArticleToItem(article: RawArticleData): KnowledgeItem {
  const slug = article.slug;
  let cluster: ContentCluster = "openapi";

  if (slug.includes("security") || slug.includes("oauth")) cluster = "api-security";
  else if (slug.includes("testing")) cluster = "api-testing";
  else if (slug.includes("documentation")) cluster = "api-documentation";
  else if (slug.includes("versioning")) cluster = "api-versioning";
  else if (slug.includes("error")) cluster = "api-errors";
  else if (slug.includes("pagination") || slug.includes("rate-limiting")) cluster = "api-performance";
  else if (slug.includes("rest-api")) cluster = "rest-api";
  else if (slug.includes("quality") || slug.includes("checklist")) cluster = "api-quality";

  return {
    id: `guide-${article.slug}`,
    type: "guide",
    slug: article.slug,
    title: article.title,
    description: article.description,
    excerpt: article.excerpt || article.description,
    cluster,
    category: (article.category as ContentCategory) || "openapi",
    primaryIntent: "informational",
    audience: "all-developers",
    difficulty: "intermediate",
    publishedAt: article.publishedAt || "2026-09-01",
    updatedAt: article.updatedAt || article.publishedAt,
    readingTime: article.readingTime || "6 min read",
    author: article.author || CANONICAL_AUTHOR.id || "rishab",
    blocks: article.content,
    answerFirst: article.description,
    faqs: article.faqs || [],
    featured: article.featured || false,
    seo: {
      title: `${article.title} — APIForge Guide`,
      description: article.description,
      keywords: article.keywords || article.tags || [],
    },
    tags: article.tags || [],
    keywords: article.keywords || [],
    tool: CLUSTERS_REGISTRY[cluster] ? {
      href: CLUSTERS_REGISTRY[cluster].defaultToolHref,
      title: CLUSTERS_REGISTRY[cluster].defaultToolTitle,
      buttonText: "Try Tool Now",
    } : undefined,
  };
}

function convertGlossaryToItem(g: RawGlossaryData): KnowledgeItem {
  let cluster: ContentCluster = "openapi";
  if (g.slug.includes("oauth") || g.slug.includes("bearer")) cluster = "api-security";
  else if (g.slug.includes("http")) cluster = "http";
  else if (g.slug.includes("rest")) cluster = "rest-api";
  else if (g.slug.includes("json-schema")) cluster = "json-schema";
  else if (g.slug.includes("idempotency")) cluster = "api-reliability";
  else if (g.slug.includes("versioning")) cluster = "api-versioning";

  const blocks: ContentBlock[] = [
    { type: "paragraph", text: g.detailedExplanation },
  ];

  if (g.codeExample) {
    blocks.push({
      type: "code",
      language: g.codeExample.language,
      code: g.codeExample.code,
      caption: g.codeExample.caption,
    });
  }

  if (g.commonMistakes && g.commonMistakes.length > 0) {
    blocks.push({
      type: "checklist",
      title: "Common Mistakes to Avoid",
      items: g.commonMistakes.map((m) => ({ text: m })),
    });
  }

  return {
    id: `glossary-${g.slug}`,
    type: "glossary",
    slug: g.slug,
    title: `What is ${g.term}?`,
    description: g.definition,
    excerpt: g.definition,
    cluster,
    category: (g.category as ContentCategory) || "openapi",
    primaryIntent: "informational",
    audience: "all-developers",
    difficulty: "beginner",
    publishedAt: g.publishedAt || "2026-09-10",
    updatedAt: g.updatedAt || g.publishedAt,
    author: CANONICAL_AUTHOR.id || "rishab",
    blocks,
    answerFirst: g.definition,
    mistakes: g.commonMistakes || [],
    faqs: g.faqs || [],
    seo: {
      title: `What is ${g.term}? API Glossary — APIForge`,
      description: g.definition,
      keywords: [g.term, "API Glossary", "API definition", ...(g.commonMistakes || [])],
    },
    tool: g.relatedToolHref ? {
      href: g.relatedToolHref,
      title: g.relatedToolTitle || "Check your API contract with APIForge",
      buttonText: "Launch Tool",
    } : undefined,
  };
}

function convertExampleToItem(ex: RawExampleData): KnowledgeItem {
  const blocks: ContentBlock[] = [
    { type: "paragraph", text: ex.problemStatement },
    {
      type: "badExample",
      title: "Incorrect / Suboptimal Implementation",
      language: ex.badExample.language,
      code: ex.badExample.code,
      explanation: ex.badExample.explanation,
    },
    {
      type: "goodExample",
      title: "Production-Grade / Recommended OpenAPI Implementation",
      language: ex.goodExample.language,
      code: ex.goodExample.code,
      explanation: ex.goodExample.explanation,
    },
    {
      type: "checklist",
      title: "APIForge Automated Quality Checks",
      items: (ex.apiforgeChecks || []).map((c) => ({ text: c, done: true })),
    },
  ];

  return {
    id: `example-${ex.slug}`,
    type: "example",
    slug: ex.slug,
    title: ex.title,
    description: ex.description,
    excerpt: ex.description,
    cluster: "openapi",
    category: (ex.category as ContentCategory) || "openapi",
    primaryIntent: "informational",
    audience: "backend-dev",
    difficulty: "intermediate",
    publishedAt: ex.publishedAt || "2026-09-15",
    updatedAt: ex.updatedAt || ex.publishedAt,
    author: CANONICAL_AUTHOR.id || "rishab",
    blocks,
    answerFirst: ex.description,
    seo: {
      title: `${ex.title} — OpenAPI Example | APIForge`,
      description: ex.description,
      keywords: [ex.title, "OpenAPI Example", "Swagger Code Snippet"],
    },
    tool: {
      href: "/openapi-validator",
      title: "Validate your OpenAPI example in APIForge Workbench",
      buttonText: "Open in Validator",
    },
  };
}

function convertComparisonToItem(comp: RawComparisonData): KnowledgeItem {
  const blocks: ContentBlock[] = [
    {
      type: "callout",
      variant: "info",
      title: "Verdict Summary",
      text: comp.verdict,
    },
    {
      type: "paragraph",
      text: comp.description,
    },
    {
      type: "comparison",
      title: "Capability Breakdown",
      headers: ["Capability", "APIForge", comp.competitorName],
      rows: comp.featuresTable.map((f) => [f.feature, f.apiforge, f.competitor]),
    },
    ...comp.sections.map((s) => ({
      type: "paragraph" as const,
      text: `${s.title}: APIForge takes the approach of ${s.apiforgeWay}, while ${comp.competitorName} relies on ${s.competitorWay}.`,
    })),
  ];

  return {
    id: `compare-${comp.slug}`,
    type: "comparison",
    slug: comp.slug,
    title: comp.title,
    description: comp.description,
    excerpt: comp.description,
    cluster: "developer-experience",
    category: "developer-tools",
    primaryIntent: "commercial",
    audience: "all-developers",
    difficulty: "intermediate",
    publishedAt: comp.publishedAt || "2026-09-20",
    updatedAt: comp.updatedAt || comp.publishedAt,
    author: CANONICAL_AUTHOR.id || "rishab",
    blocks,
    answerFirst: comp.verdict,
    faqs: comp.faqs || [],
    seo: {
      title: `${comp.title} — Developer Tool Comparison | APIForge`,
      description: comp.description,
      keywords: [`APIForge vs ${comp.competitorName}`, comp.competitorName, "API Tool Comparison"],
    },
    tool: {
      href: "/api-score",
      title: "Experience the APIForge Workbench Difference",
      buttonText: "Try APIForge Now",
    },
  };
}

const ADDITIONAL_CHECKLISTS: KnowledgeItem[] = [
  {
    id: "checklist-openapi-production",
    type: "checklist",
    slug: "openapi-production-checklist",
    title: "The Ultimate OpenAPI 3.0 & 3.1 Production Readiness Checklist",
    description: "20-point production checklist to verify OpenAPI specs before publishing or generating client SDKs.",
    cluster: "openapi",
    category: "openapi",
    primaryIntent: "informational",
    audience: "api-architect",
    difficulty: "intermediate",
    publishedAt: "2026-09-25",
    author: CANONICAL_AUTHOR.id || "rishab",
    answerFirst: "A production-grade OpenAPI specification must contain valid YAML syntax, explicit response status codes for all paths, unambiguous data types, and resolvable $ref pointers.",
    blocks: [
      {
        type: "paragraph",
        text: "Before deploying APIs or publishing developer portals, use this checklist to ensure your OpenAPI specification meets modern engineering standards.",
      },
      {
        type: "checklist",
        title: "1. Specification & Syntax Structure",
        items: [
          { text: "Valid OpenAPI 3.0.x or 3.1.x root object fields (openapi, info, paths)", done: true },
          { text: "Valid YAML / JSON formatting without syntax errors", done: true },
          { text: "All internal and external $ref pointers resolve successfully", done: true },
          { text: "Descriptive API title, version, and license information", done: true },
        ],
      },
      {
        type: "checklist",
        title: "2. Operations & Path Definitions",
        items: [
          { text: "Unique operationId attributes for SDK generator compatibility", done: true },
          { text: "Explicit HTTP status code responses (200, 400, 401, 404, 500)", done: true },
          { text: "Defined requestBody content types (application/json)", done: true },
          { text: "Parameter location specifiers (in: query, path, header)", done: true },
        ],
      },
      {
        type: "checklist",
        title: "3. Security & Authentication Schemas",
        items: [
          { text: "Global securityRequirements array declared", done: true },
          { text: "securitySchemes defined under components (Bearer, OAuth2, ApiKey)", done: true },
          { text: "HTTPS scheme enforced for all server URLs", done: true },
        ],
      },
    ],
    tool: {
      href: "/openapi-validator",
      title: "Validate your OpenAPI spec against this production checklist",
      buttonText: "Run Automated Audit",
    },
    seo: {
      title: "OpenAPI Production Readiness Checklist — APIForge",
      description: "20-point checklist to audit OpenAPI 3.0 and 3.1 specifications for production deployment.",
      keywords: ["OpenAPI Checklist", "OpenAPI audit", "API Production Readiness"],
    },
  },
];

const ADDITIONAL_REFERENCES: KnowledgeItem[] = [
  {
    id: "reference-http-status-codes",
    type: "reference",
    slug: "http-status-codes-reference",
    title: "Developer's Quick Reference Guide to HTTP Status Codes",
    description: "Complete reference for 1xx, 2xx, 3xx, 4xx, and 5xx HTTP status codes in REST APIs.",
    cluster: "http",
    category: "api-design",
    primaryIntent: "informational",
    audience: "backend-dev",
    difficulty: "beginner",
    publishedAt: "2026-09-26",
    author: CANONICAL_AUTHOR.id || "rishab",
    answerFirst: "HTTP status codes tell API clients the result of their HTTP request: 2xx indicates success, 4xx indicates client error, and 5xx indicates server error.",
    blocks: [
      {
        type: "paragraph",
        text: "Using correct HTTP status codes is essential for RESTful API design. This reference lists the standard status codes and their intended usage.",
      },
      {
        type: "table",
        headers: ["Code", "Status Name", "Intended API Usage"],
        rows: [
          ["200", "OK", "Successful GET, PUT, or POST returning payload"],
          ["201", "Created", "Successful POST resulting in resource creation"],
          ["204", "No Content", "Successful DELETE or action with empty response body"],
          ["400", "Bad Request", "Invalid JSON syntax, failed parameter validation"],
          ["401", "Unauthorized", "Missing or invalid authentication token"],
          ["403", "Forbidden", "Authenticated user lacks permissions"],
          ["404", "Not Found", "Target resource or endpoint URL does not exist"],
          ["429", "Too Many Requests", "Rate limit quota exceeded"],
          ["500", "Internal Server Error", "Unhandled backend application exception"],
        ],
      },
    ],
    tool: {
      href: "/api-testing",
      title: "Test HTTP response status codes live in APIForge Sandbox",
      buttonText: "Open API Sandbox",
    },
    seo: {
      title: "HTTP Status Codes Quick Reference — APIForge",
      description: "Comprehensive developer reference table for HTTP status codes in RESTful APIs.",
      keywords: ["HTTP Status Codes", "REST API status codes", "HTTP 200 vs 201"],
    },
  },
];

const rawGuides = [
  openapiBestPractices,
  restApiDesignBestPractices,
  swaggerVsOpenapi,
  validateSwaggerOpenapiSpec,
  apiVersioningBestPractices,
  restApiErrorHandling,
  apiNamingConventions,
  openapiResponseSchemaBestPractices,
  apiDocumentationBestPractices,
  apiSecurityBestPractices,
  apiPaginationBestPractices,
  apiRateLimitingBestPractices,
  apiTestingBestPractices,
  commonOpenapiErrors,
  apiQualityChecklist,
].map((item) => convertArticleToItem(item as RawArticleData));

const rawGlossary = [
  openapiGlossary,
  swaggerGlossary,
  restApiGlossary,
  jsonSchemaGlossary,
  apiContractGlossary,
  apiVersioningGlossary,
  idempotencyGlossary,
  paginationGlossary,
  rateLimitingGlossary,
  oauthGlossary,
  bearerTokenGlossary,
  httpStatusCodeGlossary,
  apiGatewayGlossary,
  schemaValidationGlossary,
  apiDocumentationGlossary,
].map((item) => convertGlossaryToItem(item as RawGlossaryData));

const rawExamples = [
  goodOpenapiExample,
  badOpenapiExample,
  openapiErrorResponseExample,
  openapiPaginationExample,
  openapiAuthenticationExample,
].map((item) => convertExampleToItem(item as RawExampleData));

const rawComparisons = [
  apiforgeVsSpectral,
  apiforgeVsSwaggerEditor,
  apiforgeVsPostman,
].map((item) => convertComparisonToItem(item as RawComparisonData));

export const contentRegistry = {
  guides: rawGuides,
  glossary: rawGlossary,
  examples: rawExamples,
  comparisons: rawComparisons,
  checklists: ADDITIONAL_CHECKLISTS,
  reference: ADDITIONAL_REFERENCES,

  get all(): KnowledgeItem[] {
    return [
      ...this.guides,
      ...this.glossary,
      ...this.examples,
      ...this.comparisons,
      ...this.checklists,
      ...this.reference,
    ];
  },
};

export function getKnowledgeItemBySlug(slug: string): KnowledgeItem | undefined {
  return contentRegistry.all.find((item) => item.slug === slug);
}

export function getKnowledgeItemsByCluster(cluster: ContentCluster): KnowledgeItem[] {
  return contentRegistry.all.filter((item) => item.cluster === cluster);
}

export function getKnowledgeItemsByType(type: ContentType): KnowledgeItem[] {
  return contentRegistry.all.filter((item) => item.type === type);
}

export function getRelatedContentGraph(currentSlug: string) {
  const currentItem = getKnowledgeItemBySlug(currentSlug);
  const allItems = contentRegistry.all.filter((item) => item.slug !== currentSlug);

  if (!currentItem) {
    return {
      guides: contentRegistry.guides.slice(0, 2),
      glossary: contentRegistry.glossary[0],
      example: contentRegistry.examples[0],
      tool: CLUSTERS_REGISTRY["openapi"],
    };
  }

  const scoredItems = allItems.map((item) => {
    let score = 0;
    if (item.cluster === currentItem.cluster) score += 40;
    if (item.category === currentItem.category) score += 20;
    if (item.primaryIntent === currentItem.primaryIntent) score += 10;

    const currentKeywords = currentItem.keywords || currentItem.tags || [];
    const itemKeywords = item.keywords || item.tags || [];

    for (const k of currentKeywords) {
      if (itemKeywords.some((ik) => ik.toLowerCase() === k.toLowerCase())) {
        score += 15;
      }
    }

    return { item, score };
  }).sort((a, b) => b.score - a.score);

  const relatedGuides = scoredItems
    .filter((x) => x.item.type === "guide")
    .slice(0, 2)
    .map((x) => x.item);

  const relatedGlossary = scoredItems.find((x) => x.item.type === "glossary")?.item || contentRegistry.glossary[0];
  const relatedExample = scoredItems.find((x) => x.item.type === "example" || x.item.type === "checklist")?.item || contentRegistry.examples[0];
  const clusterInfo = CLUSTERS_REGISTRY[currentItem.cluster] || CLUSTERS_REGISTRY["openapi"];

  return {
    guides: relatedGuides,
    glossary: relatedGlossary,
    example: relatedExample,
    tool: clusterInfo,
  };
}
