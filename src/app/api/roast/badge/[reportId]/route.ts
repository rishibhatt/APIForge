import { NextResponse } from "next/server";
import { getRoastReport } from "@/lib/roast/roastStorage";
import { getAppLogoBase64 } from "@/lib/seo/brandLogo";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { reportId: string } },
) {
  const { reportId } = params;
  const report = getRoastReport(reportId);
  const logoBase64 = getAppLogoBase64();

  const score = report ? Math.round(report.score) : 0;
  const statusLabel =
    score >= 80 ? "HEALTHY" : score >= 50 ? "NEEDS WORK" : "NEEDS HELP";

  const color =
    score >= 80
      ? "#22c55e" // green
      : score >= 50
        ? "#eab308" // yellow
        : "#ff6b57"; // hot coral

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="40" viewBox="0 0 240 40" fill="none">
  <defs>
    <linearGradient id="apiforgeTextGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="10%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#d0bcff"/>
      <stop offset="100%" stop-color="#a078ff"/>
    </linearGradient>
  </defs>
  <rect width="240" height="40" rx="8" fill="#131315" stroke="#2a2930" stroke-width="1.5"/>
  <rect x="1.5" y="1.5" width="125" height="37" rx="6.5" fill="#18181b"/>
  
  <!-- Logo / Brand -->
  ${logoBase64 ? `<image href="${logoBase64}" x="8" y="7" width="26" height="26" preserveAspectRatio="xMidYMid meet" />` : ""}
  <text x="${logoBase64 ? "38" : "12"}" y="24.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="url(#apiforgeTextGrad)" letter-spacing="-0.035em">APIForge</text>
  <text x="${logoBase64 ? "98" : "73"}" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="700" fill="#a1a1aa" letter-spacing="0.05em">QUALITY</text>
  
  <!-- Score & Badge -->
  <circle cx="148" cy="20" r="10" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5"/>
  <text x="148" y="23.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="${color}" text-anchor="middle">${score}</text>
  
  <text x="166" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#e5e1e4" letter-spacing="0.5">${statusLabel}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
