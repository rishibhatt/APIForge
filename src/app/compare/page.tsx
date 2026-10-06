import type { Metadata } from "next";
import { getAllComparisons } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ArticleHero from "@/components/content/ArticleHero";
import styles from "@/components/content/content.module.css";
import ContentIndex from "@/components/content/ContentIndex";


export const metadata: Metadata = createBaseMetadata({
  title: "APIForge vs Spectral, Swagger Editor & Postman",
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
      <ArticleHero
        backdrop
        wide
        breadcrumbs={[{ label: "Compare", href: "/compare" }]}
        title={<>APIForge Tool Comparisons</>}
        description={<>Neutral, technical feature matrices comparing APIForge with Spectral, Swagger Editor, and Postman.</>}
      />
      <main className={`${styles.container} ${styles.containerWide} ${styles.containerAfterHero}`}>

        <ContentIndex
          items={comparisons.map((c) => ({
            href: `/compare/${c.slug}`,
            title: c.title,
            description: c.description,
            meta: [`vs ${c.competitorName}`],
          }))}
        />
      </main>
      <LandingFooter />
    </div>
  );
}
