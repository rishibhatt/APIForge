import type { Metadata } from "next";
import Link from "next/link";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import styles from "@/components/content/content.module.css";


export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return createBaseMetadata({
    title: `API Quality Report: ${params.slug}`,
    description: `Shareable API quality report for ${params.slug}: a deterministic 0–100 OpenAPI score with design-rule findings and suggested fixes.`,
    path: `/reports/${params.slug}`,
    ogLabel: "Report",
    noindex: true,
  });
}

export default function PublicReportPage({
  params,
}: {
  params: { slug: string };
}) {
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "API quality score", url: "/api-score" },
    { name: params.slug, url: `/reports/${params.slug}` },
  ]);

  return (
    <div className={styles.pageWrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs
          items={[
            { label: "API quality score", href: "/api-score" },
            { label: params.slug, href: `/reports/${params.slug}` },
          ]}
        />
        <header className={styles.header}>
          <h1 className={styles.title}>API quality score report</h1>
          <p className={styles.description}>
            Shared reports are not stored on the server yet. Load the spec in the
            workspace to see its current score and findings.
          </p>
        </header>

        <section className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Score your own API spec</h2>
            <p className={styles.ctaDescription}>
              Run your OpenAPI or Swagger contract through APIForge to get an instant 0–100 quality score.
            </p>
          </div>
          <Link href="/#parse-api" className={styles.ctaButton}>
            Open workspace
          </Link>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
