import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Report Roast functionality has been removed." },
    { status: 410 },
  );
}
