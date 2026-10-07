/** Default cap for JSON request bodies on API routes (App Router handlers have no built-in limit). */
export const DEFAULT_MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;

export type ReadJsonObjectResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: 400 | 413; error: string };

/**
 * Reads and parses a JSON object body with a size cap. Rejects non-object JSON
 * (`null`, arrays, primitives) so handlers can safely read properties.
 */
export async function readJsonObject(
  req: Request,
  maxBytes: number = DEFAULT_MAX_JSON_BODY_BYTES,
): Promise<ReadJsonObjectResult> {
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, error: "Request body too large" };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, status: 400, error: "Could not read request body" };
  }
  if (Buffer.byteLength(text, "utf-8") > maxBytes) {
    return { ok: false, status: 413, error: "Request body too large" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, status: 400, error: "JSON body must be an object" };
  }
  return { ok: true, body: parsed as Record<string, unknown> };
}
