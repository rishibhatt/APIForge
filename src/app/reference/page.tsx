import type { Metadata } from "next";
import Link from "next/link";
import { getAllReferences } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import styles from "@/components/content/content.module.css";

export const metadata: Metadata = createBaseMetadata({
  title: "API & HTTP Developer Reference Guides — APIForge",
  description: "Quick developer reference sheets for HTTP status codes, OpenAPI schema types, and REST headers.",
  path: "/reference",
  keywords: ["HTTP Status Codes Reference", "OpenAPI Reference Sheet", "API Headers Quick Reference"],
});

export default function ReferenceHubPage() {
  const references = getAllReferences();

  return (
    <div className={styles.pageWrap}>
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs items={[{ label: "Reference", href: "/reference" }]} />
        <header className={styles.header}>
          <span className={styles.categoryBadge}>DEVELOPER KNOWLEDGE ENGINE</span>
          <h1 className={styles.title}>API & HTTP Developer Reference</h1>
          <p className={styles.description}>
            Comprehensive technical reference sheets for software engineers, backend developers, and API architects.
          </p>
        </header>

        <section className={styles.relatedGrid}>
          {references.map((item) => (
            <Link key={item.slug} href={`/reference/${item.slug}`} className={styles.relatedCard}>
              <span className={styles.relatedTag}>{item.cluster.toUpperCase()}</span>
              <h2 className={styles.relatedTitle}>{item.title}</h2>
              <p className={styles.relatedExcerpt}>{item.description}</p>
            </Link>
          ))}
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
