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
  "OpenAPI Validator",
  "Free Online OpenAPI 3.0 & 3.1 Validator & Linter | APIForge",
  "Validate OpenAPI 3.0 and 3.1 specifications online. Catch YAML syntax errors, unresolvable $ref pointers, and missing response schemas instantly.",
  "/openapi-validator",
  ["openapi validator", "validate openapi", "openapi 3.0 linter", "openapi checker online"]
);

const faqs = [
  {
    question: "What versions of OpenAPI are supported?",
    answer: "APIForge supports OpenAPI 3.0.x, OpenAPI 3.1.x, and legacy Swagger 2.0 specifications."
  },
  {
    question: "How does APIForge handle external $ref schemas?",
    answer: "APIForge resolves internal component pointers and fetches public HTTP/HTTPS schema references automatically."
  }
];

export default function OpenApiValidatorLandingPage() {
  const softwareJsonLd = generateSoftwareApplicationJsonLd(
    "OpenAPI Validator",
    "Online OpenAPI 3.0 specification validator and schema linter.",
    "/openapi-validator"
  );

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "OpenAPI Validator", url: "/openapi-validator" },
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
        <Breadcrumbs items={[{ label: "OpenAPI Validator", href: "/openapi-validator" }]} />

        <header className={styles.header}>
          <span className={styles.categoryBadge}>DEVELOPER TOOL</span>
          <h1 className={styles.title}>Online OpenAPI Validator & Linter</h1>
          <p className={styles.description}>
            Validate OpenAPI 3.0 and 3.1 specifications instantly with real-time error highlighting, $ref resolution, and schema linting.
          </p>
        </header>

        <section className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Validate Your OpenAPI Spec</h2>
            <p className={styles.ctaDescription}>
              Paste your OpenAPI YAML or JSON specification into the workspace to detect errors and inspect endpoints.
            </p>
          </div>
          <Link href="/?action=validate" className={styles.ctaButton}>
            Launch OpenAPI Validator →
          </Link>
        </section>

        <section className={styles.articleBody}>
          <h2 className={styles.heading2}>What APIForge Validates</h2>
          <ul className={styles.unorderedList}>
            <li>YAML & JSON syntax correctness and indentation</li>
            <li>Required OpenAPI root object fields (openapi, info, paths)</li>
            <li>Internal and external $ref pointer resolutions</li>
            <li>HTTP method validity and parameter location rules (in: query, path, header)</li>
            <li>Response status code declarations and schema objects</li>
          </ul>
        </section>

        <FAQSection faqs={faqs} />
      </main>
      <LandingFooter />
    </div>
  );
}
