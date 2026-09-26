import { NextResponse } from "next/server";
import { getRoastReport } from "@/lib/roast/roastStorage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { reportId: string } },
) {
  const { reportId } = params;
  const report = getRoastReport(reportId);

  const score = report ? Math.round(report.score) : 0;
  const statusLabel =
    score >= 80 ? "HEALTHY" : score >= 50 ? "NEEDS WORK" : "NEEDS HELP";

  const color =
    score >= 80
      ? "#22c55e" // green
      : score >= 50
        ? "#eab308" // yellow
        : "#ff6b57"; // hot coral

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="40" viewBox="0 0 220 40" fill="none">
  <rect width="220" height="40" rx="8" fill="#131315" stroke="#2a2930" stroke-width="1.5"/>
  <rect x="1.5" y="1.5" width="105" height="37" rx="6.5" fill="#18181b"/>
  
  <!-- Logo / Brand -->
  <text x="12" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#d0bcff" letter-spacing="0.5">APIFORGE</text>
  <text x="73" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" fill="#a1a1aa">QUALITY</text>
  
  <!-- Score & Badge -->
  <circle cx="125" cy="20" r="10" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5"/>
  <text x="125" y="23.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="${color}" text-anchor="middle">${score}</text>
  
  <text x="144" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#e5e1e4" letter-spacing="0.5">${statusLabel}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
