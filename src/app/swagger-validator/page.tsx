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
  "Swagger Validator",
  "Swagger 2.0 Validator Online",
  "Validate a Swagger 2.0 file online. Paste a swagger.json URL or a Swagger UI page to parse it, resolve definitions, list every operation and score the design.",
  "/swagger-validator",
  [
    "swagger 2.0 validator",
    "swagger validator online",
    "swagger.json validator",
    "validate swagger file",
    "swagger yaml validator",
    "swagger spec checker",
    "swagger ui url to json",
  ]
);

const faqs = [
  {
    question: "How do I validate a Swagger 2.0 file online?",
    answer: "Paste the URL of your swagger.json or swagger.yaml into the field above. A Swagger UI page works too. APIForge fetches the file on its server, parses it, resolves the definitions and lists every operation with its parameters. If nothing can be extracted, the parse error is shown."
  },
  {
    question: "What is the difference between Swagger 2.0 and OpenAPI 3.0?",
    answer: "OpenAPI 3.0 is the renamed and extended successor to Swagger 2.0. The visible changes: servers replaces host, basePath and schemes, components replaces definitions and securityDefinitions, requestBody replaces the body parameter, and consumes and produces move into content. The swagger-vs-openapi guide has the full mapping."
  },
  {
    question: "How do I find the swagger.json URL behind a Swagger UI page?",
    answer: "Open the Swagger UI page and look at the URL in its top bar, or check the browser network tab for a .json or .yaml request. You can also paste the UI page itself. APIForge tries common paths such as /swagger/v1/swagger.json and /v3/api-docs, and reads the Swagger UI initializer for the real one."
  },
  {
    question: "Why does my swagger.json fail to load?",
    answer: "The common causes are a URL that returns HTML instead of the raw file, invalid JSON or YAML, no operations under paths, a URL behind authentication, or a file over 15 MB or slower than 15 seconds. The error message names the failure it hit last. If you pasted a UI page, try the raw JSON or YAML URL."
  },
  {
    question: "Does it read host, basePath and schemes?",
    answer: "Yes. The server URL is built from schemes, host and basePath. If the spec lists no schemes, APIForge assumes https. A local $ref into definitions that points at nothing is replaced with an empty stub, so the file still loads."
  },
  {
    question: "Does it convert Swagger 2.0 to OpenAPI 3.0?",
    answer: "No. APIForge reads Swagger 2.0 directly and shows its operations in the same workspace as OpenAPI 3 specs, so you can send requests, score the design and generate TypeScript types. It does not export a converted OpenAPI 3 file."
  },
  {
    question: "Is it a strict Swagger schema validator?",
    answer: "No. It loads specs the way Swagger UI does, so small spec violations do not block the load, and it does not report line numbers. It confirms that the file parses, the references resolve and the operations can be listed. Use a schema-based linter in CI if you need strict conformance."
  },
  {
    question: "Is my spec stored, and is it free?",
    answer: "The parse request fetches the spec on the server, returns the operations to your browser and does not save the spec. APIForge is free, needs no account and is open source under the MIT license."
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
          inputId="swagger-validator-url"
          crumb={{ label: "Swagger Validator", href: "/swagger-validator" }}
          title="Swagger 2.0 validator online"
          lede="Paste a swagger.json or swagger.yaml URL, or a Swagger UI page. APIForge parses the Swagger 2.0 file, resolves its definitions, builds the server URL from host, basePath and schemes, and lists every operation with its parameters."
          cta="Validate swagger file"
          facts={["Swagger 2.0", "JSON · YAML", "Swagger UI links", "OpenAPI 3.x too"]}
          aside={<ValidateDemo />}
        />
        <div className={`${styles.container} ${styles.containerAfterHero}`}>

        <section className={styles.articleBody} data-reveal>
          <h2 className={styles.heading2}>What happens to your swagger file</h2>
          <ul className={styles.unorderedList} data-rows>
            <li>The file is fetched on the server, with a 15 second timeout and a 15 MB limit.</li>
            <li>JSON or YAML is parsed, and <code>$ref</code> pointers into <code>definitions</code> are resolved.</li>
            <li>Operations are listed with parameters, body schema, responses and <code>securityDefinitions</code>.</li>
            <li>The design is scored from 0 to 100 against seven rules, and you can send requests from the same workspace.</li>
          </ul>
          <p className={styles.paragraph}>
            Not sure which file to paste? See{" "}
            <Link className={styles.inlineLink} href="/guides/get-openapi-json-from-swagger-ui">how to get the OpenAPI JSON from a Swagger UI page</Link>.
            For the differences between the two formats, read{" "}
            <Link className={styles.inlineLink} href="/guides/swagger-vs-openapi">Swagger vs OpenAPI</Link>.
          </p>
        </section>

        <section className={styles.articleBody} data-reveal>
          <h2 className={styles.heading2}>Related tools</h2>
          <ul className={styles.unorderedList} data-rows>
            <li><Link className={styles.inlineLink} href="/openapi-validator">OpenAPI 3.0 and 3.1 validator</Link></li>
            <li><Link className={styles.inlineLink} href="/api-score">API quality score</Link> for a 0–100 design rating</li>
            <li><Link className={styles.inlineLink} href="/api-testing">Test the API from its spec</Link></li>
          </ul>
        </section>

        <FAQSection faqs={faqs} />
        </div>
      </ProductMotion>
      <LandingFooter />
    </div>
  );
}
