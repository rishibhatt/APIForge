import type { Metadata } from "next";
import PublicRoastClient from "./PublicRoastClient";
import { getRoastReport } from "@/lib/roast/roastStorage";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";

export async function generateMetadata({
  params,
}: {
  params: { reportId: string };
}): Promise<Metadata> {
  const report = getRoastReport(params.reportId);

  if (!report) {
    return {
      title: "API Roast Report Not Found | APIForge",
      description: "The requested API quality roast report could not be found or has expired.",
    };
  }

  const title = `${report.title} — API Quality Roast (${report.score}/100) | APIForge`;
  const description = `${report.title} scored ${report.score}/100 (${report.summary.verdict}). ${report.summary.roast.slice(0, 150)}...`;
  const badgeUrl = `${SITE_URL}/api/roast/badge/${params.reportId}`;
  const reportUrl = `${SITE_URL}/roast/${params.reportId}`;

  return {
    title,
    description,
    keywords: ["API roast", report.title, "OpenAPI quality report", "API audit"],
    alternates: {
      canonical: reportUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
    openGraph: {
      title,
      description,
      url: reportUrl,
      siteName: "APIForge",
      type: "article",
      images: [
        {
          url: badgeUrl,
          width: 1200,
          height: 630,
          alt: `API Quality Roast for ${report.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [badgeUrl],
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
