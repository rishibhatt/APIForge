import type { Metadata } from "next";
import Link from "next/link";
import { createToolMetadata } from "@/lib/seo/metadata";
import { generateSoftwareApplicationJsonLd, generateBreadcrumbJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import FAQSection from "@/components/content/FAQSection";
import styles from "@/components/content/content.module.css";


export const metadata: Metadata = createToolMetadata(
  "API Quality Score",
  "API Quality Score Checker — Instant OpenAPI & Swagger Audit | APIForge",
  "Calculate a deterministic 0–100 API quality score for OpenAPI 3.0 and Swagger 2.0 specifications across 7 core quality criteria.",
  "/api-score",
  ["api quality checker", "api score", "openapi score", "swagger quality auditor"]
);

const faqs = [
  {
    question: "How is the 0–100 API Quality Score calculated?",
    answer: "APIForge evaluates 7 deterministic criteria: Path Naming (20 pts), HTTP Verb Usage (20 pts), Path Structure & Depth (15 pts), Consistency & Duplicate Checks (15 pts), Versioning Prefixes (10 pts), Error Handling Coverage (10 pts), and Operation Documentation (10 pts)."
  },
  {
    question: "Does APIForge require sending spec data to an external server?",
    answer: "No. The API scoring engine executes deterministically in your browser without sending your OpenAPI specification or secrets to external LLMs or third-party servers."
  }
];

export default function ApiScoreLandingPage() {
  const softwareJsonLd = generateSoftwareApplicationJsonLd(
    "API Quality Score",
    "Calculate deterministic 0-100 quality scores for OpenAPI specifications.",
    "/api-score"
  );

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "API Quality Score", url: "/api-score" },
  ]);

  const faqJsonLd = generateFaqJsonLd(faqs);

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
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs items={[{ label: "API Quality Score", href: "/api-score" }]} />

        <header className={styles.header}>
          <span className={styles.categoryBadge}>CORE FEATURE</span>
          <h1 className={styles.title}>API Quality Score Checker</h1>
          <p className={styles.description}>
            Benchmark your OpenAPI 3.0 & Swagger 2.0 specifications with a deterministic 0–100 quality score and actionable fix recommendations.
          </p>
        </header>

        <section className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Analyze Your OpenAPI Spec Now</h2>
            <p className={styles.ctaDescription}>
              Paste any OpenAPI or Swagger URL into the APIForge workspace to generate your quality report in seconds.
            </p>
          </div>
          <Link href="/?action=score" className={styles.ctaButton}>
            Open Workbench & Calculate Score →
          </Link>
        </section>

        <section className={styles.articleBody}>
          <h2 className={styles.heading2}>Scoring Methodology & Criteria</h2>
          <p className={styles.paragraph}>
            APIForge splits API specification scoring into 7 empirical categories derived from REST design guidelines and OpenAPI standards:
          </p>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Max Weight</th>
                  <th>Evaluation Rules</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Path Naming</strong></td>
                  <td>20 points</td>
                  <td>Penalizes camelCase in paths, underscores, and verb-like segments (/getUsers).</td>
                </tr>
                <tr>
                  <td><strong>HTTP Verb Usage</strong></td>
                  <td>20 points</td>
                  <td>Penalizes GET requests containing request bodies and actions embedded in paths.</td>
                </tr>
                <tr>
                  <td><strong>Path Structure & Depth</strong></td>
                  <td>15 points</td>
                  <td>Evaluates URL segment nesting depth (penalizes paths deeper than 3 segments).</td>
                </tr>
                <tr>
                  <td><strong>Consistency</strong></td>
                  <td>15 points</td>
                  <td>Detects duplicate method/path pairs and mixed singular vs plural collection tokens.</td>
                </tr>
                <tr>
                  <td><strong>Versioning Prefixes</strong></td>
                  <td>10 points</td>
                  <td>Checks for explicit major version segments (e.g., /v1, /v2) across URL paths.</td>
                </tr>
                <tr>
                  <td><strong>Error Handling Coverage</strong></td>
                  <td>10 points</td>
                  <td>Verifies declarations of 4xx and 5xx failure status codes and reusable error schemas.</td>
                </tr>
                <tr>
                  <td><strong>Operation Documentation</strong></td>
                  <td>10 points</td>
                  <td>Calculates percentage of operations with non-empty summaries and descriptions.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <FAQSection faqs={faqs} />
      </main>
      <LandingFooter />
    </div>
  );
}
