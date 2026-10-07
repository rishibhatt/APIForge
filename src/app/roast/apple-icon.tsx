import { ImageResponse } from "next/og";
import { FIRE_LOGO_DATA_URI } from "@/lib/seo/brandLogo";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function RoastAppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#140f0d",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={132} height={132} alt="" src={FIRE_LOGO_DATA_URI} />
      </div>
    ),
    size,
  );
}
