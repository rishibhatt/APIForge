import type { Metadata } from "next";
import Link from "next/link";
import { createToolMetadata } from "@/lib/seo/metadata";
import { generateSoftwareApplicationJsonLd, generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import FAQSection from "@/components/content/FAQSection";
import styles from "@/components/content/content.module.css";


export const metadata: Metadata = createToolMetadata(
  "API Quality Checker",
  "Automated API Quality Checker & OpenAPI Linter | APIForge",
  "Audit REST API endpoints, OpenAPI specs, and Swagger files against 15+ design and quality criteria.",
  "/api-quality-checker",
  ["api quality checker", "api design audit", "openapi quality linter", "api spec health check"]
);

const faqs = [
  {
    question: "What quality issues does APIForge detect?",
    answer: "APIForge flags camelCase path segments, underscore segments, verbs in URLs, GET payloads, deep path nesting (>3), missing error schemas, duplicate paths, and unversioned endpoints."
  }
];

export default function ApiQualityCheckerLandingPage() {
  const softwareJsonLd = generateSoftwareApplicationJsonLd(
    "API Quality Checker",
    "Automated REST API design and quality auditor.",
    "/api-quality-checker"
  );

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "API Quality Checker", url: "/api-quality-checker" },
  ]);

  return (
    <div className={styles.pageWrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs items={[{ label: "API Quality Checker", href: "/api-quality-checker" }]} />

        <header className={styles.header}>
          <span className={styles.categoryBadge}>QUALITY AUDIT</span>
          <h1 className={styles.title}>Automated API Quality Checker</h1>
          <p className={styles.description}>
            Perform instant static analysis on OpenAPI specifications to identify design anti-patterns, security risks, and missing error coverage.
          </p>
        </header>

        <section className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Audit Your API Quality</h2>
            <p className={styles.ctaDescription}>
              Run an instant quality check on your OpenAPI specification.
            </p>
          </div>
          <Link href="/?action=quality-check" className={styles.ctaButton}>
            Start Quality Audit →
          </Link>
        </section>

        <FAQSection faqs={faqs} />
      </main>
      <LandingFooter />
    </div>
  );
}
