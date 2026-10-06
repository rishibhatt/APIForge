import type { Metadata } from "next";
import { Suspense } from "react";
import RoastMyApiPageClient from "./RoastMyApiPageClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";

export const metadata: Metadata = {
  title: "Roast My API: Free OpenAPI and Swagger Spec Review",
  description:
    "Paste an OpenAPI or Swagger URL and get a 0 to 100 design score, a roast written about your real endpoints, a reaction meme, and a share card. Free, no sign-up.",
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
    title: "Roast My API: Brutally Honest OpenAPI Review",
    description: "You shipped it. Let's see what you shipped. Paste an OpenAPI or Swagger spec and get a brutally honest, deterministic, shareable API quality audit.",
    url: `${SITE_URL}/roast-my-api`,
    siteName: "APIForge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Roast My API: Brutally Honest OpenAPI Review",
    description: "Your API works. Let's see if it's actually good. Paste an OpenAPI or Swagger spec and get a deterministic, shareable API quality audit.",
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
          <div className="roastZone" style={{ minHeight: "100vh", background: "var(--color-surface)" }} />
        }
      >
        <RoastMyApiPageClient />
      </Suspense>
    </>
  );
}
