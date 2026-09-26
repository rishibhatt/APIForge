import type { Metadata } from "next";
import Link from "next/link";
import { getAllExamples } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import styles from "@/components/content/content.module.css";


export const metadata: Metadata = createBaseMetadata({
  title: "OpenAPI & Swagger Specification Examples | APIForge",
  description: "Real-world valid OpenAPI 3.0 and Swagger 2.0 specification examples, anti-patterns, error responses, pagination models, and authentication schemas.",
  path: "/examples",
  keywords: ["openapi examples", "swagger specs example", "good openapi vs bad openapi"],
});

export default function ExamplesIndexPage() {
  const examples = getAllExamples();

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Examples", url: "/examples" },
  ]);

  return (
    <div className={styles.pageWrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs items={[{ label: "Examples", href: "/examples" }]} />
        <header className={styles.header}>
          <span className={styles.categoryBadge}>CODE PATTERNS</span>
          <h1 className={styles.title}>OpenAPI & Swagger Code Examples</h1>
          <p className={styles.description}>
            Side-by-side bad vs good OpenAPI patterns, error schema templates, and pagination specifications.
          </p>
        </header>

        <div className={styles.relatedGrid}>
          {examples.map((ex) => (
            <Link key={ex.slug} href={`/examples/${ex.slug}`} className={styles.relatedCard}>
              <span className={styles.relatedTag}>{ex.category.toUpperCase()}</span>
              <h2 className={styles.relatedTitle}>{ex.title}</h2>
              <p className={styles.relatedExcerpt}>{ex.description}</p>
            </Link>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
