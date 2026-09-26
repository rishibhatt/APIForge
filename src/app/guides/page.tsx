import type { Metadata } from "next";
import Link from "next/link";
import { getAllGuides } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import styles from "@/components/content/content.module.css";
export const metadata: Metadata = createBaseMetadata({
  title: "OpenAPI & REST API Guides for Engineering Teams | APIForge",
  description: "Comprehensive technical guides on OpenAPI best practices, REST API design, Swagger validation, error handling, security, and versioning.",
  path: "/guides",
  keywords: ["openapi guides", "rest api best practices", "swagger tutorials", "api design patterns"],
});

export default function GuidesPage() {
  const guides = getAllGuides();

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Guides", url: "/guides" },
  ]);

  return (
    <div className={styles.pageWrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs items={[{ label: "Guides", href: "/guides" }]} />
        <header className={styles.header}>
          <span className={styles.categoryBadge}>KNOWLEDGE BASE</span>
          <h1 className={styles.title}>APIForge Developer Guides</h1>
          <p className={styles.description}>
            In-depth technical articles, design patterns, and best practices for building, scoring, and validating OpenAPI & REST specifications.
          </p>
        </header>

        <div className={styles.relatedGrid}>
          {guides.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className={styles.relatedCard}>
              <span className={styles.relatedTag}>{g.category.toUpperCase()}</span>
              <h2 className={styles.relatedTitle}>{g.title}</h2>
              <p className={styles.relatedExcerpt}>{g.excerpt}</p>
            </Link>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
