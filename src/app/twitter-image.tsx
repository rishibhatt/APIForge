import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_ALT, OG_DEFAULT_TITLE, ogImageOptions } from "@/lib/seo/ogCard";

export const runtime = "edge";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(<OgCard title={OG_DEFAULT_TITLE} />, await ogImageOptions());
}
