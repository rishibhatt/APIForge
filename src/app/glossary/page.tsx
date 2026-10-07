import type { Metadata } from "next";
import { getAllGlossary } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ArticleHero from "@/components/content/ArticleHero";
import styles from "@/components/content/content.module.css";
import ContentIndex from "@/components/content/ContentIndex";
import { formatLabel } from "@/components/content/labels";


export const metadata: Metadata = createBaseMetadata({
  title: "API Glossary: OpenAPI, REST & Swagger Terms",
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
      <ArticleHero
        backdrop
        wide
        breadcrumbs={[{ label: "Glossary", href: "/glossary" }]}
        title={<>API & OpenAPI Glossary</>}
        description={<>Clear, developer-centric definitions and practical code examples for essential web API terminology.</>}
      />
      <main className={`${styles.container} ${styles.containerWide} ${styles.containerAfterHero}`}>

        <ContentIndex
          groupByLetter
          label="Glossary terms"
          items={[...terms]
            .sort((a, b) => a.term.localeCompare(b.term))
            .map((t) => ({
              href: `/glossary/${t.slug}`,
              title: t.term,
              description: t.definition,
              meta: [formatLabel(t.category)],
            }))}
        />
      </main>
      <LandingFooter />
    </div>
  );
}
