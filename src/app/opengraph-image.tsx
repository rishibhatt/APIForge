import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "APIForge — The Intelligent OpenAPI & Swagger Workspace";
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
          backgroundColor: "#090513",
          backgroundImage:
            "radial-gradient(circle at 85% 15%, rgba(168, 85, 247, 0.25) 0%, transparent 50%), radial-gradient(circle at 15% 85%, rgba(99, 102, 241, 0.22) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(217, 70, 239, 0.08) 0%, transparent 60%)",
          padding: "54px 64px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle grid border frame */}
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: "1px solid rgba(216, 180, 254, 0.12)",
            borderRadius: "28px",
            pointerEvents: "none",
          }}
        />

        {/* Top Navbar Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {/* Brand Logo & Name */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 28px rgba(192, 132, 252, 0.55)",
                fontSize: "26px",
                color: "#ffffff",
                fontWeight: 900,
              }}
            >
              ⚡
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span
                style={{
                  fontSize: "38px",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  background: "linear-gradient(135deg, #ffffff 10%, #d0bcff 55%, #a078ff 100%)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                APIForge
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.35)",
                  color: "#d8b4fe",
                  letterSpacing: "0.06em",
                }}
              >
                AI WORKBENCH
              </span>
            </div>
          </div>

          {/* Supported Formats Capsule */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "9999px",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "#e9d5ff",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            <span>OpenAPI 3.0</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>Swagger 2.0</span>
          </div>
        </div>

        {/* Center Hero Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "1020px" }}>
          <div
            style={{
              fontSize: "50px",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>The Intelligent API Workspace</span>
            <span
              style={{
                background: "linear-gradient(90deg, #c084fc 0%, #38bdf8 50%, #f472b6 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Test, Generate & Audit with AI
            </span>
          </div>
          <p
            style={{
              fontSize: "21px",
              lineHeight: 1.45,
              color: "rgba(243, 232, 255, 0.78)",
              margin: 0,
              maxWidth: "960px",
            }}
          >
            Parse live Swagger specs, test endpoints without CORS blockers, generate TypeScript client SDKs, and run automated REST quality scoring.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            width: "100%",
          }}
        >
          {[
            { icon: "⚡", title: "Zero-CORS Runner", desc: "Browser & smart proxy" },
            { icon: "📊", title: "API Quality Score", desc: "REST audit & auto-fix" },
            { icon: "📦", title: "TypeScript SDKs", desc: "Instant IDE prompts" },
            { icon: "🧪", title: "AI Test Matrix", desc: "Automated test suites" },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                padding: "14px 16px",
                borderRadius: "14px",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.09)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>{item.icon}</span>
                <span style={{ color: "#ffffff", fontSize: "15px", fontWeight: 800 }}>
                  {item.title}
                </span>
              </div>
              <span style={{ color: "rgba(216, 180, 254, 0.7)", fontSize: "13px", fontWeight: 500 }}>
                {item.desc}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            paddingTop: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#a855f7", fontSize: "14px", fontWeight: 700 }}>
            <span>⚡ Free & Open Source</span>
            <span style={{ opacity: 0.3 }}>•</span>
            <span>No Account Required</span>
            <span style={{ opacity: 0.3 }}>•</span>
            <span>Runs in Browser</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 800,
              backgroundColor: "rgba(168, 85, 247, 0.2)",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              padding: "6px 14px",
              borderRadius: "8px",
            }}
          >
            <span>apiforge.info</span>
            <span style={{ color: "#c084fc" }}>↗</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
