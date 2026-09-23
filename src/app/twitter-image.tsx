import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "APIForge — AI-Powered OpenAPI & Swagger Workspace";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#0c0814",
          backgroundImage:
            "radial-gradient(circle at 85% 15%, rgba(160, 120, 255, 0.28) 0%, transparent 45%), radial-gradient(circle at 15% 85%, rgba(109, 40, 217, 0.22) 0%, transparent 45%)",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header with pill & brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #d0bcff 0%, #7c4dc4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 24px rgba(160, 120, 255, 0.5)",
                fontSize: "24px",
                color: "#1c1028",
                fontWeight: 900,
              }}
            >
              ⚡
            </div>
            <span
              style={{
                fontSize: "38px",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                background: "linear-gradient(135deg, #ffffff 10%, #d0bcff 55%, #a078ff 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              APIForge
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: "9999px",
              border: "1px solid rgba(208, 188, 255, 0.3)",
              backgroundColor: "rgba(208, 188, 255, 0.08)",
              color: "#d0bcff",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Next-Gen OpenAPI Workspace
          </div>
        </div>

        {/* Central Hero text */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "980px" }}>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              margin: 0,
            }}
          >
            Forge, Audit & Supercharge Your APIs with AI
          </h1>
          <p
            style={{
              fontSize: "24px",
              lineHeight: 1.45,
              color: "rgba(235, 230, 240, 0.78)",
              margin: 0,
            }}
          >
            Parse OpenAPI & Swagger specifications, run deep automated quality audits, auto-fix schemas, and generate TypeScript clients with instant mock servers.
          </p>
        </div>

        {/* Feature Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {[
            "⚡ Live Swagger Explorer",
            "📊 API Quality Scoring",
            "🤖 AI Auto-Fix & Linter",
            "📦 TypeScript SDK & Tests",
          ].map((feature, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 20px",
                borderRadius: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e2dce8",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
