import type { Endpoint } from "@/types/api";
import { endpointToJsonSafe } from "@/lib/serialize-endpoint";

export const ALL_ENDPOINTS_SUMMARY_CAP = 100;

/** Structured payload sent to `/api/groq/assistant` and embedded in prompts. */
export type WorkspaceAssistantAiContext = {
  specName: string;
  version: string | null;
  endpoint: {
    method: string;
    path: string;
    description: string | null;
    params: unknown;
    query: unknown;
    requestBody: unknown;
    responses: unknown;
  } | null;
  allEndpointsSummary: Array<{
    method: string;
    path: string;
    summary?: string;
  }>;
};

/** UI + LLM bundle built in the workspace shell. */
export type WorkspaceAssistantApiContext = {
  specTitle: string;
  specVersion: string | null;
  endpointCount: number;
  activeTabLabel: string;
  scopeLabel: string;
  activeEndpointLine: string | null;
  activeSummary: string | null;
  /** Key for per-endpoint chat persistence (`activeEndpoint.id` or sentinel). */
  threadKey: string;
  aiContext: WorkspaceAssistantAiContext;
};

function splitParameters(parameters: unknown): { params: unknown; query: unknown } {
  if (!Array.isArray(parameters)) {
    return { params: parameters ?? null, query: null };
  }
  const params: unknown[] = [];
  const query: unknown[] = [];
  for (const item of parameters) {
    if (item && typeof item === "object" && "in" in item) {
      const loc = String((item as { in?: unknown }).in).toLowerCase();
      if (loc === "query") query.push(item);
      else params.push(item);
    } else {
      params.push(item);
    }
  }
  return {
    params: params.length > 0 ? params : null,
    query: query.length > 0 ? query : null,
  };
}

function endpointToAiSlice(ep: Endpoint): NonNullable<WorkspaceAssistantAiContext["endpoint"]> {
  const safe = endpointToJsonSafe(ep);
  const { parameters, summary, method, path, requestBody, responses } = safe;
  const { params, query } = splitParameters(parameters);
  const desc = summary?.trim() ? summary.trim() : null;
  return {
    method: method.toUpperCase(),
    path,
    description: desc,
    params,
    query,
    requestBody: requestBody ?? null,
    responses: responses ?? null,
  };
}

export function buildWorkspaceAssistantApiContext(input: {
  specTitle: string | null | undefined;
  specVersion: string | null | undefined;
  endpoints: Endpoint[];
  activeEndpoint: Endpoint | null;
  activeTabLabel: string;
  scopeLabel: string;
  defaultSpecName: string;
}): WorkspaceAssistantApiContext {
  const specName =
    input.specTitle?.trim() && input.specTitle.trim().length > 0
      ? input.specTitle.trim()
      : input.defaultSpecName;

  const version = input.specVersion?.trim() ? input.specVersion.trim() : null;

  const allEndpointsSummary = input.endpoints.slice(0, ALL_ENDPOINTS_SUMMARY_CAP).map((e) => ({
    method: e.method.toUpperCase(),
    path: e.path,
    ...(e.summary?.trim() ? { summary: e.summary.trim() } : {}),
  }));

  const ep = input.activeEndpoint;
  const aiContext: WorkspaceAssistantAiContext = {
    specName,
    version,
    endpoint: ep ? endpointToAiSlice(ep) : null,
    allEndpointsSummary,
  };

  return {
    specTitle: specName,
    specVersion: version,
    endpointCount: input.endpoints.length,
    activeTabLabel: input.activeTabLabel,
    scopeLabel: input.scopeLabel,
    activeEndpointLine: ep ? `${ep.method.toUpperCase()} ${ep.path}` : null,
    activeSummary: ep?.summary?.trim() || null,
    threadKey: ep?.id ?? "__none__",
    aiContext,
  };
}

export function isWorkspaceAssistantAiContext(v: unknown): v is WorkspaceAssistantAiContext {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.specName !== "string" || o.specName.length === 0) return false;
  if (o.version !== null && typeof o.version !== "string") return false;
  if (!Array.isArray(o.allEndpointsSummary)) return false;
  for (const row of o.allEndpointsSummary) {
    if (!row || typeof row !== "object") return false;
    const r = row as Record<string, unknown>;
    if (typeof r.method !== "string" || typeof r.path !== "string") return false;
  }
  if (o.endpoint === null) return true;
  if (!o.endpoint || typeof o.endpoint !== "object") return false;
  const e = o.endpoint as Record<string, unknown>;
  return typeof e.method === "string" && typeof e.path === "string";
}
