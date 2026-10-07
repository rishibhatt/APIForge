import type { Metadata } from "next";
import { getAllGuides } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import styles from "@/components/content/content.module.css";
import ArticleHero from "@/components/content/ArticleHero";
import GuideIndex from "@/components/content/GuideIndex";
import { byNewest, formatDate, formatLabel } from "@/components/content/labels";
export const metadata: Metadata = createBaseMetadata({
  title: "OpenAPI & REST API Design Guides",
  description: "Practical guides on OpenAPI, REST API design, Swagger validation, error handling, security, and versioning, each with a scored example spec.",
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
      <ArticleHero
        backdrop
        wide
        breadcrumbs={[{ label: "Guides", href: "/guides" }]}
        title="Guides"
        description="Practical articles on designing, documenting, validating, and testing OpenAPI and REST APIs. Each one works through a real spec and links to the APIForge tool that checks it."
      />
      <main className={`${styles.container} ${styles.containerWide} ${styles.containerAfterHero}`}>
        <GuideIndex
          items={[...guides].sort(byNewest).map((g) => ({
            href: `/guides/${g.slug}`,
            title: g.title,
            description: g.excerpt || g.description,
            topic: g.cluster,
            topicLabel: formatLabel(g.cluster),
            readingTime: g.readingTime,
            date: g.updatedAt ?? g.publishedAt,
            dateLabel: formatDate(g.updatedAt ?? g.publishedAt),
          }))}
        />
      </main>
      <LandingFooter />
    </div>
  );
}
