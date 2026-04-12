import type { Endpoint } from "@/types/api";
import type { OutputTab } from "@/types/api";

function endpointBlock(ep: Endpoint): string {
  return JSON.stringify(
    {
      method: ep.method,
      path: ep.path,
      summary: ep.summary,
      parameters: ep.parameters,
      requestBody: ep.requestBody,
      responses: ep.responses,
    },
    null,
    2,
  );
}

const typeInstructions: Record<OutputTab, string> = {
  typescript: `TypeScript types and interfaces only (no prose).
Strict typing. Use export. Match schema field names exactly.`,
  markdown: `Markdown documentation only: summary, parameters table, request/response sections.
Use ## headings. No preamble.`,
  prompt: `A single compact AI prompt template a developer can paste into an LLM to implement a client for this endpoint.
No meta commentary.`,
  snippet: `One production-ready code snippet (e.g. fetch or axios) in TypeScript calling this endpoint.
Include error handling. No explanations outside code comments.`,
};

export function buildGroqPrompt(endpoint: Endpoint, type: OutputTab): string {
  const data = endpointBlock(endpoint);
  const spec = typeInstructions[type];

  return `You are an expert API engineer.

Given this endpoint:
${data}

Generate:
${spec}

Rules:
Production ready
Typed
Clean
No explanations`;
}
