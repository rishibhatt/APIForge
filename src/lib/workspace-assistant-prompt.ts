import type { WorkspaceAssistantAiContext } from "@/lib/workspace-assistant-context";

export const WORKSPACE_ASSISTANT_SYSTEM = `You are an API assistant inside APIForge.
You ONLY answer based on the provided API context.
If the answer is not present in the context, respond with:
"I don't see this information in the current API spec."

Rules:
- Do NOT make assumptions
- Do NOT generate fake fields or endpoints
- Always reference the current endpoint when answering
- Prefer structured responses (code blocks, JSON, bullet points)`;

export type AssistantPromptKind =
  | "general"
  | "endpoint_explain"
  | "example_response"
  | "typescript_client"
  | "errors";

export function isAssistantPromptKind(v: unknown): v is AssistantPromptKind {
  return (
    v === "general" ||
    v === "endpoint_explain" ||
    v === "example_response" ||
    v === "typescript_client" ||
    v === "errors"
  );
}

function kindGuidance(kind: AssistantPromptKind): string {
  switch (kind) {
    case "endpoint_explain":
      return [
        "The user wants to know what this endpoint does.",
        "Summarize using ONLY the description, parameters, query, request body, and responses from the context.",
        "Start by naming the HTTP method and path of the current endpoint.",
      ].join(" ");
    case "example_response":
      return [
        "The user wants an example response body.",
        "Derive shape ONLY from the success responses in the context (prefer 2xx).",
        "If the spec includes an explicit example or schema, stay within it.",
        "Output JSON in a fenced code block when showing a body.",
      ].join(" ");
    case "typescript_client":
      return [
        "The user wants a TypeScript client snippet for the current endpoint only.",
        "Use fetch() against a placeholder base URL variable (e.g. const baseUrl = \"…\").",
        "Types and fields must match request/response schemas in the context only.",
      ].join(" ");
    case "errors":
      return [
        "The user wants likely errors for this endpoint.",
        "List ONLY HTTP status codes and bodies described under `responses` in the context (4xx and 5xx).",
        "If none are documented, reply with the required fallback sentence.",
      ].join(" ");
    default:
      return "";
  }
}

export function buildAssistantUserPrompt(
  userQuery: string,
  aiContext: WorkspaceAssistantAiContext,
  kind: AssistantPromptKind,
): string {
  const extra =
    kind !== "general" && kindGuidance(kind).length > 0
      ? `\n\nINTENT:\n${kindGuidance(kind)}\n`
      : "";
  return `API CONTEXT:
${JSON.stringify(aiContext, null, 2)}
${extra}
USER QUESTION:
${userQuery}`;
}
