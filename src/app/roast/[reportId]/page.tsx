import type { Metadata } from "next";
import PublicRoastClient from "./PublicRoastClient";
import { getRoastReport } from "@/lib/roast/roastStorage";
import { normalizeDescription, resolveTitle, SITE_URL } from "@/lib/seo/metadata";


export async function generateMetadata({
  params,
}: {
  params: { reportId: string };
}): Promise<Metadata> {
  const report = getRoastReport(params.reportId);

  if (!report) {
    return {
      title: "Roast Report Not Found",
      description: "The requested API quality roast report could not be found or has expired.",
      alternates: { canonical: `${SITE_URL}/roast/${params.reportId}` },
      robots: { index: false, follow: true },
    };
  }

  // Reports live in an in-memory store and expire, so they are shareable but not indexed.
  const title = `${report.title}: API Roast (${report.score}/100)`;
  const description = normalizeDescription(
    `${report.title} scored ${report.score}/100 (${report.summary.verdict}). ${report.summary.roast}`
  );
  // Ember roast card, rendered by the edge /api/og route from the data below.
  const imageUrl = `${SITE_URL}/api/og?${new URLSearchParams({
    type: "Roast",
    title,
    score: String(report.score),
    verdict: report.summary.verdict,
    api: report.title,
  }).toString()}`;
  const reportUrl = `${SITE_URL}/roast/${params.reportId}`;

  return {
    title: resolveTitle(title),
    description,
    keywords: ["API roast", report.title, "OpenAPI quality report", "API audit"],
    alternates: {
      canonical: reportUrl,
    },
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: reportUrl,
      siteName: "APIForge",
      type: "article",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `API Quality Roast for ${report.title}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function PublicRoastPage({
  params,
}: {
  params: { reportId: string };
}) {
  const report = getRoastReport(params.reportId);
  const jsonLd = report
    ? {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": `${report.title} API Quality Roast Report (${report.score}/100)`,
        "description": report.summary.roast,
        "url": `${SITE_URL}/roast/${params.reportId}`,
        "author": {
          "@type": "Organization",
          "name": "APIForge",
          "url": SITE_URL,
        },
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <PublicRoastClient reportId={params.reportId} />
    </>
  );
}
