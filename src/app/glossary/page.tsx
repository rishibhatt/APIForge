import type { Metadata } from "next";
import Link from "next/link";
import { getAllGlossary } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import styles from "@/components/content/content.module.css";


export const metadata: Metadata = createBaseMetadata({
  title: "API Terms & Definitions Glossary | APIForge",
  description: "Comprehensive developer dictionary explaining OpenAPI, Swagger, JSON Schema, REST API, Idempotency, OAuth, Bearer Tokens, and Rate Limiting.",
  path: "/glossary",
  keywords: ["api glossary", "openapi terms", "rest api dictionary", "swagger terminology"],
});

export default function GlossaryIndexPage() {
  const terms = getAllGlossary();

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Glossary", url: "/glossary" },
  ]);

  return (
    <div className={styles.pageWrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs items={[{ label: "Glossary", href: "/glossary" }]} />
        <header className={styles.header}>
          <span className={styles.categoryBadge}>DICTIONARY</span>
          <h1 className={styles.title}>API & OpenAPI Glossary</h1>
          <p className={styles.description}>
            Clear, developer-centric definitions and practical code examples for essential web API terminology.
          </p>
        </header>

        <div className={styles.relatedGrid}>
          {terms.map((t) => (
            <Link key={t.slug} href={`/glossary/${t.slug}`} className={styles.relatedCard}>
              <span className={styles.relatedTag}>{t.category.toUpperCase()}</span>
              <h2 className={styles.relatedTitle}>{t.term}</h2>
              <p className={styles.relatedExcerpt}>{t.definition}</p>
            </Link>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
