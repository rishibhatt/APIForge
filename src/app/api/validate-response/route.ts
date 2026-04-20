import { validateResponseAgainstEndpointSchema } from "@/lib/validate-response-against-schema";
import type { Endpoint } from "@/types/api";
import { isEndpoint } from "@/lib/validate-endpoint";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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

  const issues = validateResponseAgainstEndpointSchema(
    raw.endpoint as Endpoint,
    statusCode,
    raw.body,
  );

  return Response.json({ issues });
}
