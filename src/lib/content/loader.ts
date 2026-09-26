import type { Article, GlossaryEntry, OpenApiExample, Comparison } from "@/content/types";
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

const GUIDES: Article[] = [
  openapiBestPractices as Article,
  restApiDesignBestPractices as Article,
  swaggerVsOpenapi as Article,
  validateSwaggerOpenapiSpec as Article,
  apiVersioningBestPractices as Article,
  restApiErrorHandling as Article,
  apiNamingConventions as Article,
  openapiResponseSchemaBestPractices as Article,
  apiDocumentationBestPractices as Article,
  apiSecurityBestPractices as Article,
  apiPaginationBestPractices as Article,
  apiRateLimitingBestPractices as Article,
  apiTestingBestPractices as Article,
  commonOpenapiErrors as Article,
  apiQualityChecklist as Article,
];

const GLOSSARY: GlossaryEntry[] = [
  openapiGlossary as GlossaryEntry,
  swaggerGlossary as GlossaryEntry,
  restApiGlossary as GlossaryEntry,
  jsonSchemaGlossary as GlossaryEntry,
  apiContractGlossary as GlossaryEntry,
  apiVersioningGlossary as GlossaryEntry,
  idempotencyGlossary as GlossaryEntry,
  paginationGlossary as GlossaryEntry,
  rateLimitingGlossary as GlossaryEntry,
  oauthGlossary as GlossaryEntry,
  bearerTokenGlossary as GlossaryEntry,
  httpStatusCodeGlossary as GlossaryEntry,
  apiGatewayGlossary as GlossaryEntry,
  schemaValidationGlossary as GlossaryEntry,
  apiDocumentationGlossary as GlossaryEntry,
];

const EXAMPLES: OpenApiExample[] = [
  goodOpenapiExample as OpenApiExample,
  badOpenapiExample as OpenApiExample,
  openapiErrorResponseExample as OpenApiExample,
  openapiPaginationExample as OpenApiExample,
  openapiAuthenticationExample as OpenApiExample,
];

const COMPARISONS: Comparison[] = [
  apiforgeVsSpectral as Comparison,
  apiforgeVsSwaggerEditor as Comparison,
  apiforgeVsPostman as Comparison,
];

export function getAllGuides(): Article[] {
  return GUIDES;
}

export function getFeaturedGuides(): Article[] {
  return GUIDES.filter((g) => g.featured);
}

export function getGuideBySlug(slug: string): Article | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function getAllGlossary(): GlossaryEntry[] {
  return GLOSSARY;
}

export function getGlossaryBySlug(slug: string): GlossaryEntry | undefined {
  return GLOSSARY.find((e) => e.slug === slug);
}

export function getAllExamples(): OpenApiExample[] {
  return EXAMPLES;
}

export function getExampleBySlug(slug: string): OpenApiExample | undefined {
  return EXAMPLES.find((e) => e.slug === slug);
}

export function getAllComparisons(): Comparison[] {
  return COMPARISONS;
}

export function getComparisonBySlug(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

export function getRelatedContent(currentSlug: string, tags: string[] = [], category?: string) {
  const relatedGuides = GUIDES.filter((g) => g.slug !== currentSlug)
    .map((g) => {
      let score = 0;
      if (category && g.category === category) score += 3;
      for (const t of tags) {
        if (g.tags.some((tag) => tag.toLowerCase() === t.toLowerCase())) score += 2;
      }
      return { guide: g, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.guide);

  const relatedGlossary = GLOSSARY.find((e) =>
    tags.some((t) => e.term.toLowerCase().includes(t.toLowerCase())) ||
    (category && e.category === category)
  ) || GLOSSARY[0];

  const relatedExample = EXAMPLES.find((ex) =>
    tags.some((t) => ex.title.toLowerCase().includes(t.toLowerCase()))
  ) || EXAMPLES[0];

  return {
    guides: relatedGuides,
    glossary: relatedGlossary,
    example: relatedExample,
  };
}
