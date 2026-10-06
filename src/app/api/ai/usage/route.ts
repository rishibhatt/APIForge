import { applyAiUsageHeaders, peekAiUsage } from "@/lib/ai/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current AI quota snapshot for the caller. Never consumes quota. */
export async function GET(req: Request) {
  const usage = peekAiUsage(req);
  const headers = applyAiUsageHeaders(
    new Headers({ "Cache-Control": "no-store" }),
    usage,
  );
  return Response.json(usage, { headers });
}
