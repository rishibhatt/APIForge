/**
 * Recursively scans an OpenAPI document object and replaces any local $ref pointer
 * (#/components/schemas/... or #/definitions/...) that does not exist in docRoot
 * with a safe stub schema. This prevents SwaggerParser from throwing fatal "Missing $ref pointer" errors.
 */
export function sanitizeAndStubMissingRefs(docRoot: Record<string, unknown>): Record<string, unknown> {
  if (!docRoot || typeof docRoot !== "object") return docRoot;

  let clone: Record<string, unknown>;
  try {
    clone = JSON.parse(JSON.stringify(docRoot)) as Record<string, unknown>;
  } catch {
    clone = docRoot;
  }

  function resolvePointer(root: unknown, pointer: string): boolean {
    if (!pointer.startsWith("#/")) return true; // Ignore non-local pointers
    const parts = pointer.slice(2).split("/").map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
    let curr: unknown = root;
    for (const part of parts) {
      if (curr && typeof curr === "object" && !Array.isArray(curr) && part in (curr as Record<string, unknown>)) {
        curr = (curr as Record<string, unknown>)[part];
      } else {
        return false;
      }
    }
    return curr !== undefined;
  }

  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    const obj = node as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (key === "$ref" && typeof val === "string") {
        if (val.startsWith("#/") && !resolvePointer(clone, val)) {
          delete obj["$ref"];
          obj["type"] = "object";
          obj["description"] = `Unmodeled schema reference (${val})`;
        }
      } else if (val && typeof val === "object") {
        walk(val);
      }
    }
  }

  walk(clone);
  return clone;
}
