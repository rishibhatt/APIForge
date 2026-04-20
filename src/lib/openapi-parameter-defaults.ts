function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Suggested default for path/query inputs from OpenAPI parameter object. */
export function parameterExampleString(item: Record<string, unknown>): string {
  if (
    typeof item.example === "string" ||
    typeof item.example === "number" ||
    typeof item.example === "boolean"
  ) {
    return String(item.example);
  }
  const schema = item.schema;
  if (isObject(schema)) {
    if (
      schema.example !== undefined &&
      schema.example !== null &&
      typeof schema.example !== "object"
    ) {
      return String(schema.example);
    }
    if (schema.default !== undefined && schema.default !== null) {
      return String(schema.default);
    }
    if (Array.isArray(schema.enum) && schema.enum[0] != null) {
      return String(schema.enum[0]);
    }
    if (schema.type === "string") return "";
    if (schema.type === "integer" || schema.type === "number") return "0";
    if (schema.type === "boolean") return "false";
  }
  return "";
}
