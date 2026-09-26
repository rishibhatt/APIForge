import type { Metadata } from "next";
import { Suspense } from "react";
import RoastMyApiPageClient from "./RoastMyApiPageClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";

export const metadata: Metadata = {
  title: "Roast My API — Brutally Honest API Quality & REST Review | APIForge",
  description:
    "Paste your Swagger or OpenAPI specification and get a brutally honest, shareable API quality audit powered by APIForge's deterministic quality engine.",
  keywords: [
    "Roast My API",
    "API roast",
    "OpenAPI audit",
    "Swagger reviewer",
    "REST API quality score",
    "APIForge roast",
    "API linter",
    "API design review",
  ],
  alternates: {
    canonical: `${SITE_URL}/roast-my-api`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Roast My API | APIForge — Brutally Honest API Review",
    description: "You shipped it. Let's see what you shipped. Get a brutally honest, deterministic API quality audit.",
    url: `${SITE_URL}/roast-my-api`,
    siteName: "APIForge",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "APIForge Roast My API",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Roast My API | APIForge",
    description: "Your API works. Let's see if it's actually good. Run a deterministic API audit.",
    images: [`${SITE_URL}/twitter-image`],
  },
};

export default function RoastMyApiPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Roast My API by APIForge",
    "url": `${SITE_URL}/roast-my-api`,
    "description": "Brutally honest, deterministic OpenAPI and Swagger specification quality review engine.",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense
        fallback={
          <div style={{ padding: "5rem 1.5rem", textAlign: "center", color: "#a1a1aa" }}>
            Loading Roast My API...
          </div>
        }
      >
        <RoastMyApiPageClient />
      </Suspense>
    </>
  );
}
