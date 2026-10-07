function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function scalar(v: unknown): string | null {
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x !== "object")) return v.join(",");
  return null;
}

function firstNamedExample(examples: unknown): string | null {
  if (!isObject(examples)) return null;
  for (const ex of Object.values(examples)) {
    if (isObject(ex) && "value" in ex) {
      const s = scalar(ex.value);
      if (s !== null) return s;
    }
  }
  return null;
}

/** Value the spec itself suggests (example / default / enum), or null when it suggests none. */
export function parameterSpecValue(item: Record<string, unknown>): string | null {
  const direct =
    scalar(item.example) ??
    firstNamedExample(item.examples) ??
    scalar(item["x-example"]) ??
    scalar(item.default);
  if (direct !== null) return direct;
  if (Array.isArray(item.enum) && item.enum[0] != null) return String(item.enum[0]);

  // Swagger 2 arrays keep defaults/enums on `items`; OpenAPI 3 keeps them on `schema`.
  const schema = isObject(item.schema) ? item.schema : null;
  const items = isObject(item.items) ? item.items : schema && isObject(schema.items) ? schema.items : null;
  if (schema) {
    const s = scalar(schema.example) ?? scalar(schema.default);
    if (s !== null) return s;
    if (Array.isArray(schema.enum) && schema.enum[0] != null) return String(schema.enum[0]);
  }
  if (items) {
    const s = scalar(items.example) ?? scalar(items.default);
    if (s !== null) return s;
    if (Array.isArray(items.enum) && items.enum[0] != null) return String(items.enum[0]);
  }
  return null;
}

/** Declared type of a parameter (OpenAPI 3 `schema.type` or Swagger 2 `type`). */
export function parameterType(item: Record<string, unknown>): string {
  const schema = isObject(item.schema) ? item.schema : null;
  const t = (schema && typeof schema.type === "string" ? schema.type : null) ??
    (typeof item.type === "string" ? item.type : null);
  const fmt = (schema && typeof schema.format === "string" ? schema.format : null) ??
    (typeof item.format === "string" ? item.format : null);
  if (!t) return "string";
  return fmt ? `${t} (${fmt})` : t;
}

/** Suggested default for path/query inputs from OpenAPI parameter object. */
export function parameterExampleString(item: Record<string, unknown>): string {
  const fromSpec = parameterSpecValue(item);
  if (fromSpec !== null) return fromSpec;
  const schema = isObject(item.schema) ? item.schema : null;
  const type = (schema && schema.type) ?? item.type;
  if (type === "integer" || type === "number") return "0";
  if (type === "boolean") return "false";
  return "";
}
