import { ImageResponse } from "next/og";
import { RoastOgCard, OG_SIZE, ROAST_ALT, ogImageOptions } from "@/lib/seo/ogCard";

export const runtime = "edge";

export const alt = ROAST_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(<RoastOgCard />, await ogImageOptions());
}
