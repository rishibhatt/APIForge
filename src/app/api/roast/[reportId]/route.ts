import { NextResponse } from "next/server";
import { getRoastReport } from "@/lib/roast/roastStorage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { reportId: string } },
) {
  const { reportId } = params;
  if (!reportId) {
    return NextResponse.json(
      { success: false, error: "Missing report ID" },
      { status: 400 },
    );
  }

  const report = getRoastReport(reportId);
  if (!report) {
    return NextResponse.json(
      { success: false, error: "Roast report not found or expired" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    report,
  });
}
