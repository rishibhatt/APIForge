export type GroqStreamTab = "typescript" | "prompt";

export type OutputTab = GroqStreamTab | "runApi" | "testGeneration";

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
}

export interface TestCase {
  id: string;
  type: "valid" | "invalid" | "edge";
  description: string;
  payload: unknown;
  expectedStatus: number;
  reason: string;
}

export function isGroqStreamTab(tab: OutputTab): tab is GroqStreamTab {
  return tab === "typescript" || tab === "prompt";
}
