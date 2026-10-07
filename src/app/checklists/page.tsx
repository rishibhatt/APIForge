import type { Metadata } from "next";
import { getAllChecklists } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ArticleHero from "@/components/content/ArticleHero";
import styles from "@/components/content/content.module.css";
import ContentIndex from "@/components/content/ContentIndex";
import { formatLabel } from "@/components/content/labels";

export const metadata: Metadata = createBaseMetadata({
  title: "API Quality & OpenAPI Checklists",
  description: "Actionable checklists for OpenAPI production readiness, API security and REST design. Work through each item, then check your spec in APIForge.",
  path: "/checklists",
  keywords: ["API Checklist", "OpenAPI Checklist", "API Security Audit Checklist"],
});

export default function ChecklistsHubPage() {
  const checklists = getAllChecklists();

  return (
    <div className={styles.pageWrap}>
      <LandingHeader minimal />
      <ArticleHero
        backdrop
        wide
        breadcrumbs={[{ label: "Checklists", href: "/checklists" }]}
        title={<>API Quality & OpenAPI Checklists</>}
        description={<>Practical production readiness checklists and step-by-step audit guidelines for software engineering teams.</>}
      />
      <main className={`${styles.container} ${styles.containerWide} ${styles.containerAfterHero}`}>

        <ContentIndex
          items={checklists.map((item) => ({
            href: `/checklists/${item.slug}`,
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
