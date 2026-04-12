export type OutputTab = "typescript" | "markdown" | "prompt" | "snippet";

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  summary?: string;
  tags?: string[];
  requestBody?: unknown;
  responses?: unknown;
  parameters?: unknown;
}

export interface ParseSwaggerResult {
  endpoints: Endpoint[];
  title?: string;
  version?: string;
}
