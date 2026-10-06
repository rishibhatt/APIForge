import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { OgCard, RoastOgCard, OG_DEFAULT_TITLE, ogImageOptions } from "@/lib/seo/ogCard";

export const runtime = "edge";

const DEFAULT_TITLE = OG_DEFAULT_TITLE;

/** Accepts `?title=...&type=Guide`. Legacy lowercase `type` values are mapped to labels. */
const LABELS: Record<string, string> = {
  guide: "Guide",
  glossary: "Glossary",
  example: "Example",
  comparison: "Comparison",
  checklist: "Checklist",
  reference: "Reference",
  tool: "Tool",
  report: "Report",
  roast: "Roast",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = (searchParams.get("title")?.trim() || DEFAULT_TITLE).slice(0, 140);
    const rawType = (searchParams.get("type") || searchParams.get("category") || "").trim().slice(0, 40);
    const label = rawType ? LABELS[rawType.toLowerCase()] ?? rawType.slice(0, 24) : undefined;

    const options = await ogImageOptions({
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    });

    // Shared roast reports: the page (node runtime, in-memory store) passes the data in the URL.
    if (rawType.toLowerCase() === "roast") {
      const score = Number(searchParams.get("score"));
      const verdict = searchParams.get("verdict")?.trim().slice(0, 80);
      const apiTitle = searchParams.get("api")?.trim().slice(0, 80);
      const hasReport = Number.isFinite(score) && searchParams.has("score") && verdict && apiTitle;
      return new ImageResponse(
        hasReport ? (
          <RoastOgCard score={Math.round(score)} verdict={verdict} apiTitle={apiTitle} />
        ) : (
          <RoastOgCard />
        ),
        options,
      );
    }

    return new ImageResponse(<OgCard title={title} label={label} />, options);
  } catch {
    return new Response("Failed to generate OG image", { status: 500 });
  }
}
