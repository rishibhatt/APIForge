import type { Endpoint } from "@/types/api";

export type SchemaValidationIssue = {
  path: string;
  message: string;
  severity: "error" | "warning";
};

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function jsonSchemaFromResponse(
  responses: unknown,
  statusCode: number,
): unknown | null {
  if (!isObject(responses)) return null;
  const tryKeys = [
    String(statusCode),
    `${Math.floor(statusCode / 100)}xx`,
    "200",
    "201",
    "default",
  ];
  let block: unknown = null;
  for (const k of tryKeys) {
    if (k in responses) {
      block = responses[k];
      break;
    }
  }
  if (!isObject(block)) return null;
  const content = block.content;
  if (!isObject(content)) return null;
  const json =
    (content["application/json"] as unknown) ??
    (content["application/*+json"] as unknown);
  if (!isObject(json)) return null;
  if ("schema" in json) return json.schema;
  return json;
}

function schemaTypeHint(schema: unknown): string | null {
  if (!isObject(schema)) return null;
  if (typeof schema.type === "string") return schema.type;
  if (Array.isArray(schema.enum)) return "enum";
  if (isObject(schema.properties)) return "object";
  if (schema.items) return "array";
  return null;
}

function valueMatchesType(value: unknown, schema: unknown): boolean {
  if (!isObject(schema)) return true;
  const t = schemaTypeHint(schema);
  if (!t) return true;
  if (t === "string") return typeof value === "string";
  if (t === "number") return typeof value === "number";
  if (t === "integer")
    return typeof value === "number" && Number.isInteger(value);
  if (t === "boolean") return typeof value === "boolean";
  if (t === "array") return Array.isArray(value);
  if (t === "object") return value !== null && typeof value === "object";
  if (t === "enum" && Array.isArray(schema.enum)) {
    return schema.enum.includes(value as never);
  }
  return true;
}

function validateAt(
  value: unknown,
  schema: unknown,
  path: string,
  depth: number,
  issues: SchemaValidationIssue[],
  reportExtra: boolean,
): void {
  if (depth > 8) return;
  if (!isObject(schema)) return;

  const t = schemaTypeHint(schema);
  if (t && !valueMatchesType(value, schema)) {
    issues.push({
      path,
      message: `Expected type ${t}, got ${value === null ? "null" : typeof value}`,
      severity: "error",
    });
    return;
  }

  if (t === "object" && isObject(schema.properties) && isObject(value)) {
    const props = schema.properties as Record<string, unknown>;
    const required = Array.isArray(schema.required)
      ? (schema.required as string[])
      : [];
    for (const key of required) {
      if (!(key in value)) {
        issues.push({
          path: path === "$" ? `$.${key}` : `${path}.${key}`,
          message: `Missing required property "${key}"`,
          severity: "error",
        });
      }
    }
    if (reportExtra && schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in props)) {
          issues.push({
            path: path === "$" ? `$.${key}` : `${path}.${key}`,
            message: `Unexpected property "${key}" (not in schema)`,
            severity: "warning",
          });
        }
      }
    }
    for (const key of Object.keys(props)) {
      if (!(key in value)) continue;
      validateAt(
        value[key],
        props[key],
        path === "$" ? `$.${key}` : `${path}.${key}`,
        depth + 1,
        issues,
        reportExtra,
      );
    }
  }

  if (t === "array" && Array.isArray(value) && schema.items) {
    value.slice(0, 5).forEach((item, i) => {
      validateAt(
        item,
        schema.items,
        `${path}[${i}]`,
        depth + 1,
        issues,
        reportExtra,
      );
    });
  }
}

/**
 * Best-effort validation of a JSON response body against the OpenAPI response schema
 * for the given status code (falls back to 200/default).
 */
export function validateResponseAgainstEndpointSchema(
  endpoint: Endpoint,
  statusCode: number,
  body: unknown,
): SchemaValidationIssue[] {
  const schema = jsonSchemaFromResponse(endpoint.responses, statusCode);
  if (!schema) {
    return [
      {
        path: "$",
        message:
          "No JSON response schema found for this status in the spec — skipped deep validation.",
        severity: "warning",
      },
    ];
  }

  if (body === null || body === undefined) {
    return [
      {
        path: "$",
        message: "Response body is empty — cannot validate against schema.",
        severity: "warning",
      },
    ];
  }

  const issues: SchemaValidationIssue[] = [];
  validateAt(body, schema, "$", 0, issues, true);
  reportNamingAndDrift(body, schema, issues);
  return issues;
}

/** Case mismatches vs schema property names and undeclared properties (drift). */
function reportNamingAndDrift(
  body: unknown,
  schema: unknown,
  issues: SchemaValidationIssue[],
): void {
  if (!isObject(schema) || !isObject(schema.properties) || !isObject(body)) {
    return;
  }
  const props = schema.properties as Record<string, unknown>;
  const schemaKeys = Object.keys(props);
  const lowerToCanonical = new Map(
    schemaKeys.map((k) => [k.toLowerCase(), k]),
  );
  const addl = schema.additionalProperties;
  const allowExtra = addl === true || isObject(addl);

  for (const bk of Object.keys(body)) {
    if (bk in props) continue;
    const canon = lowerToCanonical.get(bk.toLowerCase());
    if (canon && canon !== bk) {
      issues.push({
        path: `$.${bk}`,
        message: `Naming inconsistency: schema defines "${canon}" but response has "${bk}"`,
        severity: "warning",
      });
      continue;
    }
    if (!allowExtra) {
      issues.push({
        path: `$.${bk}`,
        message: `Unexpected field "${bk}" (not declared in response schema; possible schema drift)`,
        severity: "warning",
      });
    }
  }
}
