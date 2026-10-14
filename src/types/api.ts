export type AIStreamTab = "typescript" | "prompt";
export type GroqStreamTab = AIStreamTab;

export type OutputTab = AIStreamTab | "runApi";

/** What to include when generating Types / AI prompt / tests. */
export type GenerationScope = "endpoint" | "collection" | "api";

/** @deprecated Use `GenerationScope` */
export type GenerationLevel = GenerationScope;

/** Optional scope for the AI Prompt tab (IDE paste target). */
export interface IdePromptScope {
  scope: GenerationScope;
  operations: Endpoint[];
}

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  summary?: string;
  /** OpenAPI `description` for the operation (when present). */
  description?: string;
  tags?: string[];
  requestBody?: unknown;
  responses?: unknown;
  parameters?: unknown;
  /** OpenAPI `security` for this operation (inherits document default when omitted in spec). */
  security?: unknown;
}

export interface ParseSwaggerResult {
  endpoints: Endpoint[];
  title?: string;
  version?: string;
  /** OpenAPI `servers` / Swagger host URLs (no trailing slash). */
  serverUrls?: string[];
  /** `components.securitySchemes` (OAS3) or `securityDefinitions` (Swagger 2), JSON-safe. */
  securitySchemes?: Record<string, unknown>;
  /** Raw spec URL that was parsed, when it differs from or was found behind the pasted URL. */
  specUrl?: string;
  /** Every spec a Swagger UI page lists (its definition dropdown), when there is more than one. */
  availableSpecs?: SpecChoice[];
}

/** One entry of a Swagger UI definition dropdown. */
export interface SpecChoice {
  url: string;
  name?: string;
}

export interface TestCase {
  id: string;
  type: "valid" | "invalid" | "edge";
  description: string;
  payload: unknown;
  expectedStatus: number;
  reason: string;
}

