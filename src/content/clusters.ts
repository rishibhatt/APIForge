import type { ContentCluster } from "./types";

export interface ClusterInfo {
  id: ContentCluster;
  title: string;
  description: string;
  primaryPillarUrl: string;
  defaultToolHref: string;
  defaultToolTitle: string;
  keywords: string[];
}

export const CLUSTERS_REGISTRY: Record<ContentCluster, ClusterInfo> = {
  openapi: {
    id: "openapi",
    title: "OpenAPI Specification",
    description: "Deep dive into OpenAPI 3.0, 3.1, and Swagger 2.0 definitions, $ref resolution, schema objects, and linting rules.",
    primaryPillarUrl: "/guides/openapi-best-practices",
    defaultToolHref: "/openapi-validator",
    defaultToolTitle: "Validate your OpenAPI Spec",
    keywords: ["OpenAPI", "Swagger", "OpenAPI 3.0", "OpenAPI 3.1", "$ref"],
  },
  "rest-api": {
    id: "rest-api",
    title: "REST API Design",
    description: "Best practices for designing clean, consistent, and developer-friendly RESTful web APIs.",
    primaryPillarUrl: "/guides/rest-api-design-best-practices",
    defaultToolHref: "/api-score",
    defaultToolTitle: "Score your REST API Design",
    keywords: ["REST API", "RESTful Design", "HTTP Methods", "Resource Naming"],
  },
  "api-security": {
    id: "api-security",
    title: "API Security & Auth",
    description: "Protect your endpoints with OAuth 2.0, Bearer tokens, rate limiting, and CORS best practices.",
    primaryPillarUrl: "/guides/api-security-best-practices",
    defaultToolHref: "/api-quality-checker",
    defaultToolTitle: "Audit API Security Rules",
    keywords: ["API Security", "OAuth2", "Bearer Token", "Rate Limiting", "CORS"],
  },
  "api-testing": {
    id: "api-testing",
    title: "API Testing & Mocking",
    description: "Contract testing, integration testing, response schema validation, and zero-CORS proxy requests.",
    primaryPillarUrl: "/guides/api-testing-best-practices",
    defaultToolHref: "/api-testing",
    defaultToolTitle: "Test your API Endpoints",
    keywords: ["API Testing", "Contract Testing", "Schema Validation", "Mock API"],
  },
  "api-documentation": {
    id: "api-documentation",
    title: "API Documentation",
    description: "Write clear, accurate developer documentation and interactive API reference guides.",
    primaryPillarUrl: "/guides/api-documentation-best-practices",
    defaultToolHref: "/openapi-validator",
    defaultToolTitle: "Validate Spec before Publishing Docs",
    keywords: ["API Documentation", "Developer Portal", "API Reference", "Swagger UI"],
  },
  "api-versioning": {
    id: "api-versioning",
    title: "API Versioning & Evolution",
    description: "Strategies for breaking vs non-breaking changes, URI vs header versioning, and client migration.",
    primaryPillarUrl: "/guides/api-versioning-best-practices",
    defaultToolHref: "/api-score",
    defaultToolTitle: "Audit Breaking Changes",
    keywords: ["API Versioning", "Breaking Changes", "Backward Compatibility"],
  },
  "api-errors": {
    id: "api-errors",
    title: "API Error Handling",
    description: "Designing consistent RFC 7807 problem details, error schemas, and standard HTTP error codes.",
    primaryPillarUrl: "/guides/rest-api-error-handling",
    defaultToolHref: "/openapi-validator",
    defaultToolTitle: "Lint Error Response Schemas",
    keywords: ["Error Handling", "RFC 7807", "HTTP Status Codes", "Error Schemas"],
  },
  "api-performance": {
    id: "api-performance",
    title: "API Performance & Caching",
    description: "Optimizing API latency, HTTP caching headers, rate limiting, and payload reduction.",
    primaryPillarUrl: "/guides/api-pagination-best-practices",
    defaultToolHref: "/api-testing",
    defaultToolTitle: "Measure Endpoint Response Time",
    keywords: ["API Performance", "Caching", "Pagination", "Rate Limiting"],
  },
  "api-reliability": {
    id: "api-reliability",
    title: "API Reliability & Resilience",
    description: "Idempotent requests, retry mechanics, circuit breakers, and fault-tolerant architecture.",
    primaryPillarUrl: "/glossary/idempotency",
    defaultToolHref: "/api-testing",
    defaultToolTitle: "Test Endpoint Idempotency",
    keywords: ["Idempotency", "Reliability", "Fault Tolerance", "Retry Policy"],
  },
  "api-governance": {
    id: "api-governance",
    title: "API Governance & Quality",
    description: "Automated linting, policy enforcement, style guides, and team API standards.",
    primaryPillarUrl: "/guides/api-quality-checklist",
    defaultToolHref: "/api-quality-checker",
    defaultToolTitle: "Check API Quality Standards",
    keywords: ["API Governance", "API Quality", "Spectral Rules", "API Standards"],
  },
  "api-quality": {
    id: "api-quality",
    title: "API Quality & Scoring",
    description: "Measuring API quality metrics, completeness 0-100 scores, and automated spec reviews.",
    primaryPillarUrl: "/guides/api-quality-checklist",
    defaultToolHref: "/api-score",
    defaultToolTitle: "Score Your API Specs",
    keywords: ["API Score", "API Audit", "API Quality Checklist"],
  },
  http: {
    id: "http",
    title: "HTTP Protocol Standards",
    description: "Mastering HTTP status codes, headers, methods, and protocol specifications for APIs.",
    primaryPillarUrl: "/glossary/http-status-code",
    defaultToolHref: "/api-testing",
    defaultToolTitle: "Test HTTP Response Statuses",
    keywords: ["HTTP Status Codes", "HTTP Headers", "CORS", "HTTP Verbs"],
  },
  "json-schema": {
    id: "json-schema",
    title: "JSON Schema & Data Types",
    description: "Understanding JSON Schema validation, data types, formats, and structural definitions.",
    primaryPillarUrl: "/glossary/json-schema",
    defaultToolHref: "/openapi-validator",
    defaultToolTitle: "Validate JSON Schema",
    keywords: ["JSON Schema", "Data Validation", "Schema Constraints"],
  },
  "developer-experience": {
    id: "developer-experience",
    title: "Developer Experience (DX)",
    description: "Building developer-friendly API client SDKs, sandboxes, error messages, and onboarding.",
    primaryPillarUrl: "/guides/api-documentation-best-practices",
    defaultToolHref: "/roast-my-api",
    defaultToolTitle: "Roast Your API Developer Experience",
    keywords: ["Developer Experience", "DX", "SDKs", "API Usability"],
  },
};

export function getClusterInfo(cluster: ContentCluster): ClusterInfo {
  return CLUSTERS_REGISTRY[cluster] || CLUSTERS_REGISTRY["openapi"];
}
