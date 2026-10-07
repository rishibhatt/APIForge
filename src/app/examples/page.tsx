import type { Metadata } from "next";
import { getAllExamples } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ArticleHero from "@/components/content/ArticleHero";
import styles from "@/components/content/content.module.css";
import ContentIndex from "@/components/content/ContentIndex";
import { formatLabel } from "@/components/content/labels";


export const metadata: Metadata = createBaseMetadata({
  title: "OpenAPI & Swagger Specification Examples",
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
      <ArticleHero
        backdrop
        wide
        breadcrumbs={[{ label: "Examples", href: "/examples" }]}
        title={<>OpenAPI & Swagger Code Examples</>}
        description={<>Side-by-side bad vs good OpenAPI patterns, error schema templates, and pagination specifications.</>}
      />
      <main className={`${styles.container} ${styles.containerWide} ${styles.containerAfterHero}`}>

        <ContentIndex
          items={examples.map((ex) => ({
            href: `/examples/${ex.slug}`,
            title: ex.title,
            description: ex.description,
            meta: [formatLabel(ex.category)],
          }))}
        />
      </main>
      <LandingFooter />
    </div>
  );
}
