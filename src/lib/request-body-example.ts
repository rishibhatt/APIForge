import type { Endpoint } from "@/types/api";

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export interface RequestBodyInfo {
  /** Media type the body is sent as (OpenAPI 3 content key, or application/json for Swagger 2). */
  mediaType: string;
  schema: Json | null;
  /** Example declared on the media type / body parameter, when the spec has one. */
  example: unknown;
  hasExample: boolean;
  required: boolean;
  /** Every media type the operation accepts (OpenAPI 3 `content` keys), preferred first. */
  mediaTypes: string[];
  /** OpenAPI 3 `encoding` for form/multipart fields: per-field `contentType`, `style`, `explode`. */
  encoding: Record<string, Json>;
}

function pickMediaType(content: Json): string | null {
  const keys = Object.keys(content);
  if (keys.length === 0) return null;
  return (
    keys.find((k) => k === "application/json") ??
    keys.find((k) => /\+json$|\/json/i.test(k)) ??
    keys.find((k) => k === "application/x-www-form-urlencoded") ??
    keys[0]!
  );
}

function firstExampleValue(examples: unknown): { found: boolean; value: unknown } {
  if (Array.isArray(examples) && examples.length > 0) return { found: true, value: examples[0] };
  if (isObject(examples)) {
    for (const ex of Object.values(examples)) {
      if (isObject(ex) && "value" in ex) return { found: true, value: ex.value };
    }
  }
  return { found: false, value: undefined };
}

/**
 * Request body for OpenAPI 3 (`requestBody.content`) and Swagger 2 (`in: body` / `in: formData` parameters).
 * `preferredMediaType` picks one of several `content` entries (the Body tab's type switcher).
 */
export function getRequestBodyInfo(endpoint: Endpoint, preferredMediaType?: string): RequestBodyInfo | null {
  const rb = endpoint.requestBody;
  if (isObject(rb)) {
    const content = isObject(rb.content) ? rb.content : null;
    const picked = content ? pickMediaType(content) : null;
    const mt = content && preferredMediaType && preferredMediaType in content ? preferredMediaType : picked;
    const mediaTypes = content ? [picked!, ...Object.keys(content).filter((k) => k !== picked)].filter(Boolean) : [];
    const media = content && mt && isObject(content[mt]) ? (content[mt] as Json) : null;
    const schema = media && isObject(media.schema) ? (media.schema as Json) : null;
    let example: unknown = undefined;
    let hasExample = false;
    if (media && "example" in media && media.example !== undefined) {
      example = media.example;
      hasExample = true;
    } else if (media) {
      const ex = firstExampleValue(media.examples);
      if (ex.found) {
        example = ex.value;
        hasExample = true;
      }
    }
    return {
      mediaType: mt ?? "application/json",
      schema,
      example,
      hasExample,
      required: rb.required === true,
      mediaTypes,
      encoding: media && isObject(media.encoding) ? (media.encoding as Record<string, Json>) : {},
    };
  }

  const params = Array.isArray(endpoint.parameters) ? endpoint.parameters.filter(isObject) : [];
  const bodyParam = params.find((p) => p.in === "body");
  if (bodyParam) {
    const schema = isObject(bodyParam.schema) ? (bodyParam.schema as Json) : null;
    const ex = bodyParam["x-example"] ?? (bodyParam as Json).example;
    return {
      mediaType: "application/json",
      schema,
      example: ex,
      hasExample: ex !== undefined,
      required: bodyParam.required === true,
      mediaTypes: ["application/json"],
      encoding: {},
    };
  }
  const formParams = params.filter((p) => p.in === "formData" && typeof p.name === "string");
  if (formParams.length > 0) {
    const properties: Json = {};
    const required: string[] = [];
    for (const p of formParams) {
      const { name, in: _in, required: req, description: _d, ...rest } = p;
      void _in;
      void _d;
      properties[name as string] = rest;
      if (req === true) required.push(name as string);
    }
    // Swagger 2 has no per-operation content type here; a `type: file` field means multipart.
    const hasFile = formParams.some((p) => p.type === "file");
    const mediaType = hasFile ? "multipart/form-data" : "application/x-www-form-urlencoded";
    return {
      mediaType,
      schema: { type: "object", properties, required },
      example: undefined,
      hasExample: false,
      required: required.length > 0,
      mediaTypes: hasFile ? [mediaType] : [mediaType, "multipart/form-data"],
      encoding: {},
    };
  }
  return null;
}

function stringForFormat(format: string | undefined, name: string): string {
  switch (format) {
    case "email":
      return "user@example.com";
    case "date-time":
      return new Date(Date.UTC(2025, 0, 15, 9, 30)).toISOString();
    case "date":
      return "2025-01-15";
    case "time":
      return "09:30:00";
    case "uuid":
      return "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    case "uri":
    case "url":
      return "https://example.com";
    case "hostname":
      return "example.com";
    case "ipv4":
      return "192.0.2.1";
    case "ipv6":
      return "2001:db8::1";
    case "password":
      return "Str0ng-passw0rd";
    case "byte":
      return "U3dhZ2dlcg==";
    case "binary":
      return "";
    default:
      break;
  }
  const n = name.toLowerCase();
  if (n.includes("email")) return "user@example.com";
  if (n.endsWith("url") || n.endsWith("uri") || n.includes("photo")) return "https://example.com/image.png";
  if (n.includes("phone")) return "+1-555-0100";
  if (n === "username" || n === "login") return "jane_doe";
  if (n.includes("firstname") || n === "first_name") return "Jane";
  if (n.includes("lastname") || n === "last_name") return "Doe";
  if (n === "name" || n.endsWith("name")) return "example";
  if (n.includes("password")) return "Str0ng-passw0rd";
  return "string";
}

function mergeAllOf(schema: Json): Json {
  if (!Array.isArray(schema.allOf)) return schema;
  const merged: Json = { ...schema, type: schema.type ?? "object", properties: {}, required: [] };
  delete merged.allOf;
  for (const part of schema.allOf) {
    if (!isObject(part)) continue;
    const p = mergeAllOf(part);
    if (isObject(p.properties)) Object.assign(merged.properties as Json, p.properties);
    if (Array.isArray(p.required)) (merged.required as unknown[]).push(...p.required);
  }
  if (isObject(schema.properties)) Object.assign(merged.properties as Json, schema.properties);
  if (Array.isArray(schema.required)) (merged.required as unknown[]).push(...schema.required);
  return merged;
}

/**
 * Builds a plausible value from a JSON schema: declared example → default → enum → const →
 * a placeholder by type and format. Object keys are ordered required first.
 */
export function exampleFromSchema(input: unknown, name = "", depth = 0, seen = new Set<unknown>()): unknown {
  if (!isObject(input)) return null;
  if (seen.has(input) || depth > 6) return isObject(input) && input.type === "array" ? [] : null;
  const nextSeen = new Set(seen);
  nextSeen.add(input);

  let schema = input;
  if (schema.example !== undefined) return schema.example;
  if (Array.isArray(schema.examples) && schema.examples.length > 0) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];
  if (schema.const !== undefined) return schema.const;

  if (Array.isArray(schema.allOf)) schema = mergeAllOf(schema);
  const variant = (Array.isArray(schema.oneOf) && schema.oneOf[0]) || (Array.isArray(schema.anyOf) && schema.anyOf[0]);
  if (variant && isObject(variant)) return exampleFromSchema(variant, name, depth + 1, nextSeen);

  let type = schema.type;
  if (Array.isArray(type)) type = type.find((x) => x !== "null") ?? type[0];
  if (!type) {
    if (isObject(schema.properties)) type = "object";
    else if (isObject(schema.items)) type = "array";
  }

  switch (type) {
    case "object": {
      const out: Json = {};
      const props = isObject(schema.properties) ? schema.properties : {};
      const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
      const keys = [
        ...required.filter((k) => k in props),
        ...Object.keys(props).filter((k) => !required.includes(k)),
      ];
      for (const key of keys) {
        const prop = props[key];
        if (isObject(prop) && prop.readOnly === true) continue;
        out[key] = exampleFromSchema(prop, key, depth + 1, nextSeen);
      }
      if (keys.length === 0 && isObject(schema.additionalProperties)) {
        out.key = exampleFromSchema(schema.additionalProperties, "key", depth + 1, nextSeen);
      }
      return out;
    }
    case "array": {
      const item = exampleFromSchema(schema.items, name.replace(/s$/, ""), depth + 1, nextSeen);
      return item === null || item === undefined ? [] : [item];
    }
    case "integer":
    case "number": {
      if (typeof schema.minimum === "number") return schema.minimum;
      if (typeof schema.exclusiveMinimum === "number") return schema.exclusiveMinimum + 1;
      return type === "integer" ? 0 : 0.0;
    }
    case "boolean":
      return false;
    case "string": {
      const s = stringForFormat(typeof schema.format === "string" ? schema.format : undefined, name);
      const min = typeof schema.minLength === "number" ? schema.minLength : 0;
      return s.length >= min ? s : s.padEnd(min, "x");
    }
    case "null":
      return null;
    default:
      return null;
  }
}

export interface BodyExampleResult {
  text: string;
  source: "spec-example" | "schema";
}

/** JSON text for "Insert example": the spec's own example when present, otherwise a schema skeleton. */
export function buildRequestBodyExample(endpoint: Endpoint, preferredMediaType?: string): BodyExampleResult | null {
  const info = getRequestBodyInfo(endpoint, preferredMediaType);
  if (!info) return null;
  if (info.hasExample) {
    const v = info.example;
    return {
      text: typeof v === "string" ? v : JSON.stringify(v, null, 2),
      source: "spec-example",
    };
  }
  if (!info.schema) return { text: "{}", source: "schema" };
  const value = exampleFromSchema(info.schema);
  return { text: JSON.stringify(value ?? {}, null, 2), source: "schema" };
}

export interface JsonValidity {
  state: "empty" | "valid" | "invalid";
  message?: string;
  line?: number;
}

/** Inline validity for the body editor; reports the line of the first syntax error when the engine gives a position. */
export function checkJson(text: string): JsonValidity {
  if (!text.trim()) return { state: "empty" };
  try {
    JSON.parse(text);
    return { state: "valid" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid JSON";
    const pos = /position (\d+)/i.exec(msg);
    let line: number | undefined;
    if (pos) line = text.slice(0, Number(pos[1])).split("\n").length;
    const lineMatch = /line (\d+)/i.exec(msg);
    if (!line && lineMatch) line = Number(lineMatch[1]);
    const clean = msg.replace(/^JSON\.parse: /, "").replace(/ in JSON at position \d+.*$/, "").replace(/\s*\(line \d+ column \d+\)$/, "");
    return { state: "invalid", message: clean, line };
  }
}
