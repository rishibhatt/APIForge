import type { Metadata } from "next";
import Link from "next/link";
import { getAllChecklists } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import styles from "@/components/content/content.module.css";

export const metadata: Metadata = createBaseMetadata({
  title: "API Quality & OpenAPI Checklists — APIForge Knowledge Engine",
  description: "Actionable developer checklists for OpenAPI production readiness, API security, and REST API design.",
  path: "/checklists",
  keywords: ["API Checklist", "OpenAPI Checklist", "API Security Audit Checklist"],
});

export default function ChecklistsHubPage() {
  const checklists = getAllChecklists();

  return (
    <div className={styles.pageWrap}>
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs items={[{ label: "Checklists", href: "/checklists" }]} />
        <header className={styles.header}>
          <span className={styles.categoryBadge}>DEVELOPER KNOWLEDGE ENGINE</span>
          <h1 className={styles.title}>API Quality & OpenAPI Checklists</h1>
          <p className={styles.description}>
            Practical production readiness checklists and step-by-step audit guidelines for software engineering teams.
          </p>
        </header>

        <section className={styles.relatedGrid}>
          {checklists.map((item) => (
            <Link key={item.slug} href={`/checklists/${item.slug}`} className={styles.relatedCard}>
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
