import type { Metadata } from "next";
import Link from "next/link";
import { createToolMetadata } from "@/lib/seo/metadata";
import { generateSoftwareApplicationJsonLd, generateBreadcrumbJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ToolHero from "@/components/sections/LandingMarketing/ToolHero";
import ProductMotion from "@/components/sections/LandingMarketing/ProductMotion";
import { ValidateDemo } from "@/components/sections/LandingMarketing/Demos";
import FAQSection from "@/components/content/FAQSection";
import styles from "@/components/content/content.module.css";


export const metadata: Metadata = createToolMetadata(
  "OpenAPI Validator",
  "OpenAPI Validator Online (3.0 / 3.1)",
  "Validate an OpenAPI 3.0 or 3.1 file online. Paste a spec URL to parse JSON or YAML, resolve $ref pointers, list every operation and get a 0–100 design score.",
  "/openapi-validator",
  [
    "openapi validator online",
    "validate openapi file",
    "openapi yaml validator",
    "openapi 3.1 validator",
    "openapi 3.0 validator",
    "openapi spec checker",
    "validate openapi json",
  ]
);

const faqs = [
  {
    question: "How do I validate an OpenAPI file online?",
    answer: "Paste the URL of the OpenAPI JSON or YAML file into the field above and submit. APIForge fetches it from its server, parses it, resolves the $ref pointers and opens the list of operations. If it cannot extract a single operation, it shows the parse error instead."
  },
  {
    question: "Which OpenAPI versions does it support?",
    answer: "OpenAPI 3.0.x and 3.1.x, plus Swagger 2.0. For a Swagger 2.0 file, APIForge builds the server URL from host, basePath and schemes, and reads securityDefinitions as the security schemes."
  },
  {
    question: "Is this a strict schema validator?",
    answer: "No. APIForge loads specs the way Swagger UI does, so a file with small spec violations still opens. It does not check every rule of the OpenAPI schema and it does not report line numbers. It tells you whether the file parses, whether the references resolve, and what the operations look like. For strict conformance, run a schema-based linter in CI as well."
  },
  {
    question: "Why does my OpenAPI spec fail to load?",
    answer: "The usual causes are a URL that returns HTML instead of the raw spec, broken JSON or YAML syntax, a file with no operations under paths, a URL behind a login, or a file over 15 MB or slower than 15 seconds. If you paste a Swagger UI page, APIForge tries common spec paths such as /openapi.json and /v3/api-docs. The common-openapi-errors guide covers the mistakes that survive loading."
  },
  {
    question: "Does it validate YAML, and can I use a local file?",
    answer: "It reads both. Text that starts with { is parsed as JSON, anything else as YAML. The URL field on this page only takes a link. To check a local .json, .yaml or .yml file, upload it on the Roast My API page, which runs the same parser and the same design rules."
  },
  {
    question: "How does it handle $ref pointers?",
    answer: "Internal pointers such as #/components/schemas/Order are resolved. External http and https references are fetched through the same address filter as the spec itself. File references are switched off. Circular references are left in place, and a local pointer to a schema that does not exist is replaced by an empty stub so the rest of the spec still loads."
  },
  {
    question: "Is my spec stored?",
    answer: "The parse request fetches the spec on the server, returns the operations to your browser and does not save the spec. Roast My API is separate: a shared roast report is kept in server memory for up to 7 days, and it holds the score and findings."
  },
  {
    question: "Is it free?",
    answer: "Yes. There is no account and no pricing. APIForge is open source under the MIT license."
  }
];

export default function OpenApiValidatorLandingPage() {
  const softwareJsonLd = generateSoftwareApplicationJsonLd(
    "OpenAPI Validator",
    "Online OpenAPI 3.0 and 3.1 parser with $ref resolution and an API design score.",
    "/openapi-validator"
  );

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "OpenAPI Validator", url: "/openapi-validator" },
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
      <ProductMotion>
        <ToolHero
          inputId="openapi-validator-url"
          crumb={{ label: "OpenAPI Validator", href: "/openapi-validator" }}
          title="OpenAPI validator online for 3.0 and 3.1"
          lede="Paste the URL of an OpenAPI 3.0 or 3.1 file, in JSON or YAML. APIForge parses it, resolves every $ref, lists each operation with its parameters and responses, and scores the design from 0 to 100."
          cta="Validate spec"
          facts={["OpenAPI 3.0 · 3.1", "Swagger 2.0", "JSON · YAML", "$ref resolution"]}
          aside={<ValidateDemo />}
        />
        <div className={`${styles.container} ${styles.containerAfterHero}`}>

        <section className={styles.articleBody} data-reveal>
          <h2 className={styles.heading2}>What the validator checks</h2>
          <ul className={styles.unorderedList} data-rows>
            <li>The file parses as JSON or YAML. Syntax errors stop the load and the message is shown.</li>
            <li>Internal and external <code>$ref</code> pointers resolve. Broken local pointers are stubbed so the rest still loads.</li>
            <li>Every operation under <code>paths</code> is extracted with its method, parameters, request body, responses and security.</li>
            <li>Server URLs are read from <code>servers</code> (OpenAPI 3) or <code>host</code>, <code>basePath</code> and <code>schemes</code> (Swagger 2.0).</li>
            <li>The operations are scored against seven design rules. The <Link className={styles.inlineLink} href="/api-score">API quality score</Link> page lists them.</li>
          </ul>
          <p className={styles.paragraph}>
            It is a parser and a design check, not a full schema validator. The step-by-step version of this check is in{" "}
            <Link className={styles.inlineLink} href="/guides/validate-swagger-openapi-spec">How to validate an OpenAPI or Swagger spec file</Link>.
          </p>
        </section>

        <section className={styles.articleBody} data-reveal>
          <h2 className={styles.heading2}>Related tools and guides</h2>
          <ul className={styles.unorderedList} data-rows>
            <li><Link className={styles.inlineLink} href="/swagger-validator">Swagger 2.0 validator</Link> for older swagger.json files</li>
            <li><Link className={styles.inlineLink} href="/api-quality-checker">REST API linter</Link> for per-route design issues</li>
            <li><Link className={styles.inlineLink} href="/api-testing">API testing from your spec</Link> to send real requests</li>
            <li><Link className={styles.inlineLink} href="/guides/common-openapi-errors">Common OpenAPI errors and how to fix them</Link></li>
          </ul>
        </section>

        <FAQSection faqs={faqs} />
        </div>
      </ProductMotion>
      <LandingFooter />
    </div>
  );
}
