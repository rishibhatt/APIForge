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
    title: `API Quality Report — ${params.slug} | APIForge`,
    description: `Public shareable API quality audit and OpenAPI assessment report for ${params.slug}.`,
    path: `/reports/${params.slug}`,
    ogType: "article",
  });
}

export default function PublicReportPage({
  params,
}: {
  params: { slug: string };
}) {
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Reports", url: "/reports" },
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
            { label: "Reports", href: "/guides" },
            { label: params.slug, href: `/reports/${params.slug}` },
          ]}
        />
        <header className={styles.header}>
          <span className={styles.categoryBadge}>PUBLIC REPORT</span>
          <h1 className={styles.title}>API Quality Score Report</h1>
          <p className={styles.description}>
            Automated quality audit report generated for specification identifier: {params.slug}
          </p>
        </header>

        <section className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Analyze Your Own API Spec</h2>
            <p className={styles.ctaDescription}>
              Run your OpenAPI or Swagger contract through APIForge to get an instant 0–100 quality score.
            </p>
          </div>
          <Link href="/?action=report" className={styles.ctaButton}>
            Analyze Your API →
          </Link>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
