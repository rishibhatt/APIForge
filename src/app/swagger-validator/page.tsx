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
  "Swagger Validator",
  "Free Online Swagger 2.0 Spec Validator & Parser | APIForge",
  "Validate and parse Swagger 2.0 specifications online. Resolve host, basePath, parameters, and definitions components effortlessly.",
  "/swagger-validator",
  ["swagger validator", "validate swagger 2.0", "swagger file parser", "swagger spec linter"]
);

const faqs = [
  {
    question: "Can I convert Swagger 2.0 to OpenAPI 3.0 in APIForge?",
    answer: "Yes, APIForge parses Swagger 2.0 specifications and normalizes endpoints into OpenAPI 3.0 structures automatically."
  }
];

export default function SwaggerValidatorLandingPage() {
  const softwareJsonLd = generateSoftwareApplicationJsonLd(
    "Swagger Validator",
    "Online Swagger 2.0 specification validator.",
    "/swagger-validator"
  );

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Swagger Validator", url: "/swagger-validator" },
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
        <Breadcrumbs items={[{ label: "Swagger Validator", href: "/swagger-validator" }]} />

        <header className={styles.header}>
          <span className={styles.categoryBadge}>LEGACY SPEC TOOL</span>
          <h1 className={styles.title}>Online Swagger 2.0 Validator</h1>
          <p className={styles.description}>
            Parse, validate, and inspect Swagger 2.0 specifications with instant linting, definition pointer checks, and interactive endpoint previews.
          </p>
        </header>

        <section className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Validate Your Swagger 2.0 File</h2>
            <p className={styles.ctaDescription}>
              Upload or paste your Swagger 2.0 JSON or YAML spec to verify compliance.
            </p>
          </div>
          <Link href="/?action=swagger" className={styles.ctaButton}>
            Launch Swagger Validator →
          </Link>
        </section>

        <FAQSection faqs={faqs} />
      </main>
      <LandingFooter />
    </div>
  );
}
