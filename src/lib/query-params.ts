/**
 * Serializes Run API query rows the way OpenAPI describes them (`style` / `explode`):
 * - array, form + explode (default): `?id=1&id=2`
 * - array, form, explode: false: `?id=1,2`; pipeDelimited `?id=1|2`; spaceDelimited `?id=1 2`
 * - object, deepObject: `?filter[name]=a&filter[age]=3`
 * - object, form + explode (default): `?name=a&age=3`
 * - the same key on several rows: repeated keys
 */

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export interface QueryRowInput {
  key: string;
  value: string;
  enabled: boolean;
}

/** Splits a user-typed list: a JSON array, or comma-separated values. */
function splitList(value: string): string[] {
  const v = value.trim();
  if (v.startsWith("[")) {
    try {
      const arr = JSON.parse(v) as unknown;
      if (Array.isArray(arr)) return arr.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
    } catch {
      /* fall through to comma split */
    }
  }
  return v === "" ? [] : v.split(",").map((s) => s.trim());
}

function parseObject(value: string): Json | null {
  try {
    const o = JSON.parse(value) as unknown;
    return isObject(o) ? o : null;
  } catch {
    return null;
  }
}

function schemaType(spec: Json | undefined): string | undefined {
  if (!spec) return undefined;
  const schema = isObject(spec.schema) ? spec.schema : spec; // OAS3 `schema`, Swagger 2 inline
  const t = Array.isArray(schema.type) ? schema.type.find((x) => x !== "null") : schema.type;
  if (typeof t === "string") return t;
  if (isObject(schema.properties)) return "object";
  return undefined;
}

export function serializeQueryRows(
  rows: QueryRowInput[],
  specs: Record<string, Json> = {},
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const add = (k: string, v: string | string[]) => {
    const prev = out[k];
    if (prev === undefined) out[k] = v;
    else out[k] = [...(Array.isArray(prev) ? prev : [prev]), ...(Array.isArray(v) ? v : [v])];
  };

  for (const r of rows) {
    const key = r.key.trim();
    if (!r.enabled || !key || r.value === "") continue;
    const spec = specs[key];
    const type = schemaType(spec);
    // Swagger 2 uses collectionFormat (default csv, inline `type`); OAS3 uses style/explode (default form + explode).
    const swagger2 = spec !== undefined && !isObject(spec.schema) && typeof spec.type === "string";
    const collection =
      typeof spec?.collectionFormat === "string" ? spec.collectionFormat : swagger2 ? "csv" : undefined;
    const style = typeof spec?.style === "string" ? spec.style : "form";
    const explode =
      typeof spec?.explode === "boolean" ? spec.explode : collection ? collection === "multi" : style === "form";

    if (type === "array") {
      const items = splitList(r.value);
      if (collection === "pipes" || style === "pipeDelimited") add(key, items.join("|"));
      else if (collection === "ssv" || style === "spaceDelimited") add(key, items.join(" "));
      else if (collection === "tsv") add(key, items.join("\t"));
      else if (explode) add(key, items);
      else add(key, items.join(","));
      continue;
    }

    if (type === "object") {
      const obj = parseObject(r.value);
      if (obj) {
        const entries = Object.entries(obj).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)] as const);
        if (style === "deepObject") {
          for (const [k, v] of entries) add(`${key}[${k}]`, v);
        } else if (explode) {
          for (const [k, v] of entries) add(k, v);
        } else {
          add(key, entries.flat().join(","));
        }
        continue;
      }
    }

    add(key, r.value);
  }
  return out;
}

/** `?a=1&a=2` preview string for the URL bar. */
export function queryString(q: Record<string, string | string[]>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(q)) {
    for (const one of Array.isArray(v) ? v : [v]) {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(one)}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}
