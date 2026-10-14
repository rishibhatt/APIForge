import type { Endpoint } from "@/types/api";

/**
 * Deterministic, spec-faithful renderings of an OpenAPI operation. These feed the TypeScript and
 * "AI prompt" generators so facts (names, params, status codes, auth) never depend on the model.
 */

export const NOT_SPECIFIED = "Not specified in the spec";

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function oneLine(s: unknown, max = 200): string {
  if (typeof s !== "string") return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function cell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function pascal(s: string): string {
  return s
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/**
 * Stable PascalCase base for the per-operation types, e.g. POST /pet -> "PostPet" (so the
 * generated names are PostPetRequest / PostPetResponse), GET /pet/{petId} -> "GetPetByPetId".
 */
export function operationTypeBase(ep: Pick<Endpoint, "method" | "path">): string {
  const method = pascal(ep.method.toLowerCase());
  const segs = ep.path
    .split("/")
    .filter(Boolean)
    .map((seg) => {
      const m = /^\{(.+)\}$/.exec(seg) ?? /^:(.+)$/.exec(seg);
      return m ? `By${pascal(m[1]!)}` : pascal(seg);
    });
  return `${method}${segs.join("")}` || method;
}

function schemaLabel(schema: unknown, depth = 0): string {
  if (!isObj(schema) || depth > 4) return "unknown";
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum
      .slice(0, 12)
      .map((v) => JSON.stringify(v))
      .join(" | ");
  }
  const nullable = schema.nullable === true ? " | null" : "";
  const parts = (key: "oneOf" | "anyOf" | "allOf", sep: string): string | null => {
    const arr = schema[key];
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.slice(0, 6).map((s) => schemaLabel(s, depth + 1)).join(sep);
  };
  const one = parts("oneOf", " | ") ?? parts("anyOf", " | ");
  if (one) return `${one}${nullable}`;
  const all = parts("allOf", " & ");
  if (all) return `${all}${nullable}`;

  const t = schema.type;
  if (t === "array") return `${schemaLabel(schema.items, depth + 1)}[]${nullable}`;
  if (t === "object" || isObj(schema.properties)) {
    return `${typeof schema.title === "string" ? schema.title : "object"}${nullable}`;
  }
  const base = Array.isArray(t) ? t.join(" | ") : typeof t === "string" ? t : null;
  if (!base) return typeof schema.title === "string" ? schema.title : "unknown";
  const fmt = typeof schema.format === "string" ? ` (${schema.format})` : "";
  return `${base}${fmt}${nullable}`;
}

const DROP_KEYS = new Set(["example", "examples", "externalDocs", "xml", "x-codegen-request-body-name"]);

/**
 * Compact schema JSON that KEEPS names, types, required, enums and short descriptions (needed for
 * JSDoc), drops examples/vendor keys, guards against cycles and hard-caps the size.
 */
function compactSchemaJson(value: unknown, maxChars: number): string {
  const seen = new WeakSet<object>();
  const prune = (v: unknown, depth: number): unknown => {
    if (v == null || typeof v === "number" || typeof v === "boolean") return v;
    if (typeof v === "string") return v.length > 160 ? `${v.slice(0, 160)}…` : v;
    if (typeof v !== "object") return String(v);
    if (seen.has(v as object)) return "[circular]";
    if (depth > 7) return "…";
    seen.add(v as object);
    let out: unknown;
    if (Array.isArray(v)) {
      const head = v.slice(0, 16).map((x) => prune(x, depth + 1));
      out = v.length > 16 ? [...head, `+${v.length - 16} more`] : head;
    } else {
      const o = v as Obj;
      const rec: Obj = {};
      let n = 0;
      for (const k of Object.keys(o)) {
        if (DROP_KEYS.has(k) || k.startsWith("x-")) continue;
        if (n++ >= 40) {
          rec["…"] = "more keys omitted";
          break;
        }
        rec[k] = prune(o[k], depth + 1);
      }
      out = rec;
    }
    seen.delete(v as object);
    return out;
  };
  try {
    const s = JSON.stringify(prune(value, 0));
    if (s === undefined) return "null";
    if (s.length <= maxChars) return s;
    return `${s.slice(0, maxChars)} /* …trimmed */`;
  } catch {
    return '"[unserializable]"';
  }
}

export interface ParamInfo {
  name: string;
  in: string;
  type: string;
  required: boolean;
  description: string;
}

function collectParams(ep: Endpoint): ParamInfo[] {
  if (!Array.isArray(ep.parameters)) return [];
  const out: ParamInfo[] = [];
  for (const p of ep.parameters) {
    if (!isObj(p) || typeof p.name !== "string") continue;
    const loc = typeof p.in === "string" ? p.in : "unknown";
    if (loc === "body") continue; // Swagger 2 body is reported as the request body
    const schema = isObj(p.schema) ? p.schema : p;
    out.push({
      name: p.name,
      in: loc,
      type: schemaLabel(schema),
      required: p.required === true || loc === "path",
      description: oneLine(p.description, 160),
    });
  }
  return out;
}

export interface BodyInfo {
  contentType: string;
  schema: unknown;
  required: boolean;
}

function collectRequestBodies(ep: Endpoint): BodyInfo[] {
  const out: BodyInfo[] = [];
  const rb = ep.requestBody;
  if (isObj(rb)) {
    const required = rb.required === true;
    if (isObj(rb.content)) {
      for (const [ct, media] of Object.entries(rb.content)) {
        out.push({
          contentType: ct,
          schema: isObj(media) && "schema" in media ? media.schema : null,
          required,
        });
      }
    } else if (rb.schema !== undefined) {
      out.push({ contentType: "application/json", schema: rb.schema, required });
    }
  }
  if (out.length === 0 && Array.isArray(ep.parameters)) {
    const body = ep.parameters.find((p) => isObj(p) && p.in === "body");
    if (isObj(body)) {
      out.push({
        contentType: "application/json",
        schema: body.schema ?? null,
        required: body.required === true,
      });
    }
  }
  return out;
}

export interface ResponseInfo {
  status: string;
  description: string;
  schemas: Array<{ contentType: string; schema: unknown }>;
}

function collectResponses(ep: Endpoint): ResponseInfo[] {
  if (!isObj(ep.responses)) return [];
  const out: ResponseInfo[] = [];
  for (const [status, r] of Object.entries(ep.responses)) {
    if (!isObj(r)) {
      out.push({ status, description: "", schemas: [] });
      continue;
    }
    const schemas: ResponseInfo["schemas"] = [];
    if (isObj(r.content)) {
      for (const [ct, media] of Object.entries(r.content)) {
        if (isObj(media) && media.schema !== undefined) schemas.push({ contentType: ct, schema: media.schema });
      }
    } else if (r.schema !== undefined) {
      schemas.push({ contentType: "application/json", schema: r.schema });
    }
    out.push({ status, description: oneLine(r.description, 200), schemas });
  }
  out.sort((a, b) => a.status.localeCompare(b.status));
  return out;
}

/** Human-readable auth for an operation, resolving scheme types when the spec's schemes are known. */
export function describeAuth(
  ep: Endpoint,
  securitySchemes?: Record<string, unknown>,
): string {
  if (ep.security === undefined || ep.security === null) return NOT_SPECIFIED;
  if (!Array.isArray(ep.security)) return NOT_SPECIFIED;
  if (ep.security.length === 0) return "None (operation is explicitly public)";
  const alts: string[] = [];
  for (const req of ep.security) {
    if (!isObj(req)) continue;
    const names = Object.keys(req);
    if (names.length === 0) {
      alts.push("None (optional)");
      continue;
    }
    alts.push(
      names
        .map((n) => {
          const def = securitySchemes && isObj(securitySchemes[n]) ? (securitySchemes[n] as Obj) : null;
          const bits: string[] = [];
          if (def) {
            const t = typeof def.type === "string" ? def.type : "";
            const scheme = typeof def.scheme === "string" ? def.scheme : "";
            const loc = typeof def.in === "string" ? def.in : "";
            const hdr = typeof def.name === "string" ? def.name : "";
            bits.push([t, scheme, loc && hdr ? `${loc} ${hdr}` : ""].filter(Boolean).join(" "));
          }
          const scopes = Array.isArray(req[n]) ? (req[n] as unknown[]).filter((s) => typeof s === "string") : [];
          if (scopes.length) bits.push(`scopes: ${scopes.join(", ")}`);
          return bits.length ? `${n} (${bits.join("; ")})` : n;
        })
        .join(" + "),
    );
  }
  return alts.length ? alts.join(" OR ") : NOT_SPECIFIED;
}

export interface ApiMeta {
  specTitle?: string;
  serverUrls?: string[];
  securitySchemes?: Record<string, unknown>;
}

export function describeContext(meta: ApiMeta | undefined): string {
  const name = meta?.specTitle?.trim() || NOT_SPECIFIED;
  const urls = meta?.serverUrls?.filter(Boolean) ?? [];
  const base = urls.length ? urls.join(", ") : NOT_SPECIFIED;
  return `- API name: ${name}\n- Base URL: ${base}`;
}

/** Markdown contract block for one operation (heading level is chosen by the caller). */
export function buildOperationContract(
  ep: Endpoint,
  meta?: ApiMeta,
  opts?: { heading?: string; maxSchemaChars?: number },
): string {
  const max = opts?.maxSchemaChars ?? 1_800;
  const lines: string[] = [];
  if (opts?.heading) lines.push(`${opts.heading} ${ep.method.toUpperCase()} ${ep.path}`, "");
  const summary = oneLine(ep.summary, 200);
  const desc = oneLine(ep.description, 300);
  lines.push(`- Method: ${ep.method.toUpperCase()}`);
  lines.push(`- Path: \`${ep.path}\``);
  lines.push(`- Summary: ${summary || NOT_SPECIFIED}`);
  if (desc && desc !== summary) lines.push(`- Description: ${desc}`);
  lines.push(`- Auth: ${describeAuth(ep, meta?.securitySchemes)}`);
  lines.push("");

  const params = collectParams(ep);
  lines.push("**Parameters (path, query, header)**", "");
  if (params.length === 0) {
    lines.push(`${NOT_SPECIFIED} (no parameters declared).`);
  } else {
    lines.push("| Name | In | Type | Required | Description |", "| --- | --- | --- | --- | --- |");
    for (const p of params) {
      lines.push(
        `| \`${cell(p.name)}\` | ${cell(p.in)} | ${cell(p.type)} | ${p.required ? "yes" : "no"} | ${cell(p.description) || NOT_SPECIFIED} |`,
      );
    }
  }
  lines.push("");

  const bodies = collectRequestBodies(ep);
  lines.push("**Request body**", "");
  if (bodies.length === 0) {
    lines.push("None declared.");
  } else {
    for (const b of bodies) {
      lines.push(
        `- \`${b.contentType}\` (${b.required ? "required" : "optional"}): schema \`${compactSchemaJson(b.schema, max)}\``,
      );
    }
  }
  lines.push("");

  const responses = collectResponses(ep);
  lines.push("**Responses**", "");
  if (responses.length === 0) {
    lines.push(`${NOT_SPECIFIED} (no responses declared).`);
  } else {
    for (const r of responses) {
      const head = `- \`${r.status}\`: ${r.description || NOT_SPECIFIED}`;
      if (r.schemas.length === 0) {
        lines.push(`${head} (no body schema)`);
      } else {
        for (const s of r.schemas.slice(0, 2)) {
          lines.push(`${head}; \`${s.contentType}\` schema \`${compactSchemaJson(s.schema, max)}\``);
        }
      }
    }
  }
  return lines.join("\n");
}

/** Compact authoritative JSON for the model (keeps descriptions for JSDoc, drops noise). */
export function operationForModel(ep: Endpoint, maxChars = 7_000): string {
  return compactSchemaJson(
    {
      method: ep.method.toUpperCase(),
      path: ep.path,
      summary: ep.summary,
      description: ep.description,
      security: ep.security,
      parameters: ep.parameters,
      requestBody: ep.requestBody,
      responses: ep.responses,
    },
    maxChars,
  );
}
