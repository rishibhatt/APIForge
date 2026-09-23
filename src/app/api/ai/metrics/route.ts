import { ai } from "@/lib/ai/service";

export const runtime = "nodejs";

export async function GET() {
  const metrics = ai.getMetrics();
  return Response.json(metrics, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
