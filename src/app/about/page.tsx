import type { Metadata } from "next";
import Link from "next/link";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateOrganizationJsonLd, generatePersonJsonLd, generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { CANONICAL_AUTHOR } from "@/lib/content/author";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import styles from "@/components/content/content.module.css";


export const metadata: Metadata = createBaseMetadata({
  title: "About APIForge — The Intelligent OpenAPI & Swagger Workspace",
  description: "APIForge is an AI-native API quality, testing, and OpenAPI/Swagger analysis workbench developed by Rishab Bhatt.",
  path: "/about",
  keywords: ["about apiforge", "apiforge architecture", "openapi workspace", "rishab bhatt apiforge"],
});

export default function AboutPage() {
  const orgJsonLd = generateOrganizationJsonLd();
  const personJsonLd = generatePersonJsonLd();
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "About", url: "/about" },
  ]);

  return (
    <div className={styles.pageWrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs items={[{ label: "About", href: "/about" }]} />

        <header className={styles.header}>
          <span className={styles.categoryBadge}>COMPANY & PRODUCT</span>
          <h1 className={styles.title}>About APIForge</h1>
          <p className={styles.description}>
            APIForge is an AI-native API quality, testing, and OpenAPI/Swagger analysis workbench built for engineering teams.
          </p>
        </header>

        <section className={styles.articleBody}>
          <h2 className={styles.heading2}>Product Overview</h2>
          <p className={styles.paragraph}>
            APIForge allows developers to analyze OpenAPI 3.0 and Swagger 2.0 specifications, identify API design flaws, calculate deterministic API quality scores, execute live HTTP requests with zero CORS blockers, generate client SDKs, and auto-repair broken schemas.
          </p>

          <h2 className={styles.heading2}>Core Capabilities</h2>
          <ul className={styles.unorderedList}>
            <li><strong>Deterministic Quality Score:</strong> Calculates a 0–100 quality score across 7 design categories.</li>
            <li><strong>OpenAPI & Swagger Parser:</strong> Validates JSON/YAML syntax and resolves internal/external $ref pointers.</li>
            <li><strong>Interactive API Testing:</strong> Zero-CORS proxy request runner for live endpoint testing.</li>
            <li><strong>AI Schema Auto-Fix:</strong> Automated identification and repair of schema errors.</li>
            <li><strong>TypeScript SDK Generator:</strong> Instant client code generation.</li>
          </ul>

          <h2 className={styles.heading2}>Founder & Developer</h2>
          <div className={styles.authorBox}>
            <div className={styles.authorAvatar}>R</div>
            <div className={styles.authorInfo}>
              <div className={styles.authorHeader}>
                <span className={styles.authorName}>{CANONICAL_AUTHOR.name}</span>
                <span className={styles.authorRole}>{CANONICAL_AUTHOR.role}</span>
              </div>
              <p className={styles.paragraph} style={{ margin: "8px 0", fontSize: "14px" }}>
                {CANONICAL_AUTHOR.bio}
              </p>
              <div className={styles.authorLinks}>
                <a href={CANONICAL_AUTHOR.website} target="_blank" rel="noopener noreferrer">Website</a>
                <a href={CANONICAL_AUTHOR.github} target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href={CANONICAL_AUTHOR.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href={CANONICAL_AUTHOR.x} target="_blank" rel="noopener noreferrer">X (Twitter)</a>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Try APIForge Today</h2>
            <p className={styles.ctaDescription}>Start scoring and testing your OpenAPI contracts in seconds.</p>
          </div>
          <Link href="/" className={styles.ctaButton}>
            Launch APIForge Workbench →
          </Link>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
