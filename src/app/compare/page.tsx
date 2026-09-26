import type { Metadata } from "next";
import Link from "next/link";
import { getAllComparisons } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import styles from "@/components/content/content.module.css";


export const metadata: Metadata = createBaseMetadata({
  title: "APIForge Comparisons: Factual Developer Tool Comparisons",
  description: "Factual technical comparisons between APIForge, Stoplight Spectral, Swagger Editor, and Postman for OpenAPI linting and API quality.",
  path: "/compare",
  keywords: ["apiforge vs spectral", "apiforge vs swagger editor", "apiforge vs postman"],
});

export default function CompareIndexPage() {
  const comparisons = getAllComparisons();

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Compare", url: "/compare" },
  ]);

  return (
    <div className={styles.pageWrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs items={[{ label: "Compare", href: "/compare" }]} />
        <header className={styles.header}>
          <span className={styles.categoryBadge}>DEVELOPER TOOL COMPARISONS</span>
          <h1 className={styles.title}>APIForge Tool Comparisons</h1>
          <p className={styles.description}>
            Neutral, technical feature matrices comparing APIForge with Spectral, Swagger Editor, and Postman.
          </p>
        </header>

        <div className={styles.relatedGrid}>
          {comparisons.map((c) => (
            <Link key={c.slug} href={`/compare/${c.slug}`} className={styles.relatedCard}>
              <span className={styles.relatedTag}>COMPARISON</span>
              <h2 className={styles.relatedTitle}>{c.title}</h2>
              <p className={styles.relatedExcerpt}>{c.description}</p>
            </Link>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
