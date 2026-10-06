import { ai } from "@/lib/ai/service";

export const runtime = "nodejs";

/**
 * Internal AI health metrics (recent events include upstream error messages and model names).
 * Open in development; in production it requires AI_METRICS_TOKEN as a Bearer token.
 */
export async function GET(req: Request) {
  const token = process.env.AI_METRICS_TOKEN?.trim();
  if (process.env.NODE_ENV === "production" || token) {
    const auth = req.headers.get("authorization") ?? "";
    if (!token || auth !== `Bearer ${token}`) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const metrics = ai.getMetrics();
  return Response.json(metrics, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
