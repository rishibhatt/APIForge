import { validateResponseAgainstEndpointSchema } from "@/lib/validate-response-against-schema";
import type { Endpoint } from "@/types/api";
import { isEndpoint } from "@/lib/validate-endpoint";
import { readJsonObject } from "@/lib/http/read-json-body";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Proxied responses are capped at 5MB; leave room for the endpoint schema.
  const parsedBody = await readJsonObject(req, 8 * 1024 * 1024);
  if (!parsedBody.ok) {
    return Response.json({ error: parsedBody.error }, { status: parsedBody.status });
  }
  const body: unknown = parsedBody.body;

  const raw = body as {
    endpoint?: unknown;
    statusCode?: unknown;
    body?: unknown;
  };

  if (!isEndpoint(raw.endpoint)) {
    return Response.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const statusCode =
    typeof raw.statusCode === "number" && Number.isFinite(raw.statusCode)
      ? Math.trunc(raw.statusCode)
      : 200;

  try {
    const issues = validateResponseAgainstEndpointSchema(
      raw.endpoint as Endpoint,
      statusCode,
      raw.body,
    );
    return Response.json({ issues });
  } catch (e) {
    console.error("[validate-response] schema validation failed:", e);
    return Response.json(
      { error: "Could not validate response against schema" },
      { status: 422 },
    );
  }
}
