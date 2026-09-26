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
  "API Testing",
  "Interactive API Testing & Explorer Workbench | APIForge",
  "Test live API endpoints with zero CORS blockers, automated request parameter population, TypeScript SDK generation, and mock responses.",
  "/api-testing",
  ["api testing workbench", "cors proxy api tester", "interactive openapi explorer", "api request runner"]
);

const faqs = [
  {
    question: "How does APIForge bypass CORS restrictions during live testing?",
    answer: "APIForge includes an integrated server-side proxy gateway that routes requests securely to target servers, eliminating CORS origin errors."
  }
];

export default function ApiTestingLandingPage() {
  const softwareJsonLd = generateSoftwareApplicationJsonLd(
    "API Testing Workbench",
    "Interactive OpenAPI explorer and zero-CORS API request runner.",
    "/api-testing"
  );

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "API Testing", url: "/api-testing" },
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
        <Breadcrumbs items={[{ label: "API Testing", href: "/api-testing" }]} />

        <header className={styles.header}>
          <span className={styles.categoryBadge}>LIVE WORKBENCH</span>
          <h1 className={styles.title}>Interactive API Testing Workbench</h1>
          <p className={styles.description}>
            Transform OpenAPI specifications into interactive API test suites. Execute live HTTP requests with zero CORS blockers and inspect raw payloads.
          </p>
        </header>

        <section className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Test Live APIs Zero-CORS</h2>
            <p className={styles.ctaDescription}>
              Load any OpenAPI specification and start sending test requests immediately.
            </p>
          </div>
          <Link href="/?action=test" className={styles.ctaButton}>
            Open API Testing Workbench →
          </Link>
        </section>

        <FAQSection faqs={faqs} />
      </main>
      <LandingFooter />
    </div>
  );
}
