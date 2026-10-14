import type { ExecutionBodyKind } from "@/types/execution";
import { exampleFromSchema, type RequestBodyInfo } from "@/lib/request-body-example";

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Which body editor a media type needs. */
export function bodyKindForMediaType(mediaType: string | undefined): ExecutionBodyKind {
  const mt = (mediaType ?? "application/json").toLowerCase().split(";")[0]!.trim();
  if (mt.startsWith("multipart/")) return "multipart";
  if (mt === "application/x-www-form-urlencoded") return "form";
  if (mt === "application/json" || mt.endsWith("+json") || mt.endsWith("/json") || mt === "*/*") return "json";
  if (
    mt.startsWith("text/") ||
    /[/+](xml|yaml|x-yaml|graphql|csv|javascript|x-ndjson|ndjson)$/.test(mt)
  ) {
    return "text";
  }
  // application/octet-stream, image/*, video/*, audio/*, application/pdf, application/zip, …
  return "binary";
}

/** One field of a form / multipart body, derived from the schema. */
export interface FormFieldSpec {
  name: string;
  kind: "text" | "file";
  /** Array of files (`type: array, items: { format: binary }`). */
  multiple: boolean;
  required: boolean;
  /** Prefilled text value (example / default / placeholder). */
  value: string;
  /** Per-part Content-Type from `encoding`, e.g. application/json for a JSON part. */
  contentType?: string;
  /** Accept filter for the file picker, from `encoding.contentType` or `contentMediaType`. */
  accept?: string;
  /** Type hint shown next to the name (string, integer, file, object…). */
  hint: string;
  description?: string;
}

/** True for schemas that describe uploaded bytes: OAS3 `format: binary`, OAS3.1 `contentMediaType`, Swagger 2 `type: file`. */
export function isFileSchema(s: unknown): boolean {
  if (!isObject(s)) return false;
  if (s.type === "file") return true;
  if (s.format === "binary") return true;
  if (typeof s.contentMediaType === "string" && !/^text\/|json/i.test(s.contentMediaType)) return true;
  if (s.contentEncoding === "binary") return true;
  return false;
}

function typeHint(s: Json): string {
  const t = Array.isArray(s.type) ? s.type.find((x) => x !== "null") : s.type;
  if (typeof t === "string") return typeof s.format === "string" && t !== "array" ? `${t} (${s.format})` : t;
  if (isObject(s.properties)) return "object";
  return "value";
}

function textValue(schema: Json, name: string): string {
  const v = exampleFromSchema(schema, name);
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : JSON.stringify(v);
}

/** Form / multipart fields for a request body schema (object properties), required first. */
export function formFieldsFromBody(info: RequestBodyInfo): FormFieldSpec[] {
  const schema = info.schema;
  if (!schema) return [];
  const merged: Json = { properties: {}, required: [] };
  const parts = Array.isArray(schema.allOf) ? [schema, ...schema.allOf] : [schema];
  for (const p of parts) {
    if (!isObject(p)) continue;
    if (isObject(p.properties)) Object.assign(merged.properties as Json, p.properties);
    if (Array.isArray(p.required)) (merged.required as unknown[]).push(...p.required);
  }
  const props = merged.properties as Json;
  const required = (merged.required as unknown[]).filter((x): x is string => typeof x === "string");
  const names = [...required.filter((k) => k in props), ...Object.keys(props).filter((k) => !required.includes(k))];
  const multipart = bodyKindForMediaType(info.mediaType) === "multipart";

  const fields: FormFieldSpec[] = [];
  for (const name of names) {
    const prop = props[name];
    if (!isObject(prop) || prop.readOnly === true) continue;
    const enc = isObject(info.encoding[name]) ? info.encoding[name] : undefined;
    const encType = typeof enc?.contentType === "string" ? enc.contentType : undefined;
    const items = isObject(prop.items) ? prop.items : null;
    const fileArray = prop.type === "array" && items !== null && isFileSchema(items);
    const file = multipart && (isFileSchema(prop) || fileArray);
    const mediaHint =
      encType ??
      (typeof prop.contentMediaType === "string" ? prop.contentMediaType : undefined) ??
      (items && typeof items.contentMediaType === "string" ? items.contentMediaType : undefined);

    if (file) {
      fields.push({
        name,
        kind: "file",
        multiple: fileArray,
        required: required.includes(name),
        value: "",
        accept: mediaHint && mediaHint !== "application/octet-stream" ? mediaHint.replace(/\s*;.*$/, "") : undefined,
        hint: fileArray ? "file[]" : "file",
        description: typeof prop.description === "string" ? prop.description : undefined,
      });
      continue;
    }

    // Objects and arrays in multipart are sent as JSON parts (OpenAPI's default for non-primitive parts).
    const complex = prop.type === "object" || prop.type === "array" || isObject(prop.properties);
    fields.push({
      name,
      kind: "text",
      multiple: false,
      required: required.includes(name),
      value: textValue(prop, name),
      contentType: encType ?? (multipart && complex ? "application/json" : undefined),
      hint: typeHint(prop),
      description: typeof prop.description === "string" ? prop.description : undefined,
    });
  }
  return fields;
}
