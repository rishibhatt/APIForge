import type { Metadata } from "next";
import { getAllReferences } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ArticleHero from "@/components/content/ArticleHero";
import styles from "@/components/content/content.module.css";
import ContentIndex from "@/components/content/ContentIndex";
import { formatLabel } from "@/components/content/labels";

export const metadata: Metadata = createBaseMetadata({
  title: "API & HTTP Developer Reference",
  description: "Quick developer reference sheets for HTTP status codes, OpenAPI schema types and REST headers, with examples you can check against your own spec.",
  path: "/reference",
  keywords: ["HTTP Status Codes Reference", "OpenAPI Reference Sheet", "API Headers Quick Reference"],
});

export default function ReferenceHubPage() {
  const references = getAllReferences();

  return (
    <div className={styles.pageWrap}>
      <LandingHeader minimal />
      <ArticleHero
        backdrop
        wide
        breadcrumbs={[{ label: "Reference", href: "/reference" }]}
        title={<>API & HTTP Developer Reference</>}
        description={<>Comprehensive technical reference sheets for software engineers, backend developers, and API architects.</>}
      />
      <main className={`${styles.container} ${styles.containerWide} ${styles.containerAfterHero}`}>

        <ContentIndex
          items={references.map((item) => ({
            href: `/reference/${item.slug}`,
            title: item.title,
            description: item.description,
            meta: [formatLabel(item.cluster), item.readingTime],
          }))}
        />
      </main>
      <LandingFooter />
    </div>
  );
}
