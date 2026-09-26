import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "APIForge — The Intelligent OpenAPI & Swagger Workspace";
    const category = searchParams.get("category") || searchParams.get("type") || "DEVELOPER TOOL";
    const name = searchParams.get("name") || "";
    const versus = searchParams.get("versus") || "";

    const subtitleText = name
      ? `Developer Utility & Interactive Sandbox for ${name}`
      : versus
      ? `Factual Technical & Feature Breakdown vs ${versus}`
      : "Automated API Quality, OpenAPI Linting & AI Audit";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#0c0814",
            padding: "60px 70px",
            fontFamily: "system-ui, sans-serif",
            backgroundImage: "radial-gradient(circle at 15% 15%, #2a144e 0%, transparent 45%), radial-gradient(circle at 85% 85%, #1a2542 0%, transparent 45%)",
          }}
        >
          {/* Header Badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #d0bcff 0%, #7c4dc4 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1c1028",
                  fontWeight: "900",
                  fontSize: "24px",
                }}
              >
                ⚡
              </div>
              <span style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px" }}>
                APIForge
              </span>
            </div>
            <div
              style={{
                backgroundColor: "rgba(208, 188, 255, 0.12)",
                border: "1px solid rgba(208, 188, 255, 0.3)",
                color: "#d0bcff",
                padding: "8px 18px",
                borderRadius: "30px",
                fontSize: "14px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "1.2px",
              }}
            >
              {category}
            </div>
          </div>

          {/* Main Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px", marginBottom: "20px" }}>
            <h1
              style={{
                fontSize: title.length > 55 ? "42px" : "54px",
                fontWeight: "800",
                color: "#f5f3f8",
                lineHeight: 1.15,
                margin: 0,
                letterSpacing: "-1px",
              }}
            >
              {title}
            </h1>
            <p style={{ fontSize: "22px", color: "rgba(229, 225, 228, 0.72)", margin: 0, lineHeight: 1.4 }}>
              {subtitleText}
            </p>
          </div>

          {/* Footer Metadata */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              paddingTop: "24px",
            }}
          >
            <span style={{ fontSize: "18px", color: "#a078ff", fontWeight: "600" }}>
              https://apiforge.info
            </span>
            <div style={{ display: "flex", gap: "20px", fontSize: "16px", color: "rgba(255, 255, 255, 0.5)" }}>
              <span>OpenAPI 3.0 & Swagger 2.0</span>
              <span>•</span>
              <span>Zero CORS Proxy</span>
              <span>•</span>
              <span>TypeScript SDK</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch {
    return new Response("Failed to generate OG Image", { status: 500 });
  }
}
