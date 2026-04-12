import { ImageResponse } from "next/og";

/** Aligned with src/styles/variables.css */
const SURFACE = "#0d112a";
const PRIMARY_CONTAINER = "#00d4ff";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: SURFACE,
          color: PRIMARY_CONTAINER,
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: "-0.06em",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        AF
      </div>
    ),
    {
      ...size,
    },
  );
}
