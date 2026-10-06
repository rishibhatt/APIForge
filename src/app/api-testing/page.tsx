import type { Metadata } from "next";
import Link from "next/link";
import { createToolMetadata } from "@/lib/seo/metadata";
import { generateSoftwareApplicationJsonLd, generateBreadcrumbJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ToolHero from "@/components/sections/LandingMarketing/ToolHero";
import ProductMotion from "@/components/sections/LandingMarketing/ProductMotion";
import { RunDemo } from "@/components/sections/LandingMarketing/Demos";
import FAQSection from "@/components/content/FAQSection";
import styles from "@/components/content/content.module.css";


export const metadata: Metadata = createToolMetadata(
  "API Testing",
  "REST API Testing Tool Online",
  "Test a REST API online from its OpenAPI spec. Send requests from your browser, fall back to a proxy on CORS errors, and check each response against its schema.",
  "/api-testing",
  [
    "rest api testing tool online",
    "test api online",
    "test api online without postman",
    "api tester from openapi spec",
    "swagger api tester",
    "test api cors error",
    "online api client",
  ]
);

const faqs = [
  {
    question: "How do I test a REST API from an OpenAPI spec?",
    answer: "Paste the spec URL above. APIForge lists every operation. Pick one, fill in the parameters, body and auth, and press Send. The response status, headers, body and timing appear next to the request, and the body is checked against the response schema from the spec."
  },
  {
    question: "Can I test an API without Postman?",
    answer: "Yes, for requests that follow from a spec. There is nothing to install and no account. Requests are built from the operations in the OpenAPI file, and you can export them as cURL, JavaScript fetch, JSON or a Postman collection. It does not replace a full client with scripting and shared team collections."
  },
  {
    question: "Why do I get a CORS error when testing an API?",
    answer: "Browsers only let a page read a response if the API sends CORS headers that allow the page's origin. If the API does not, the browser blocks the call before you see anything. In Auto mode APIForge detects this and retries the request from its server, which is not subject to CORS."
  },
  {
    question: "Can I test an API on localhost?",
    answer: "Use Browser mode. The request then leaves your own machine, so localhost is your localhost, though the API must send CORS headers that allow APIForge. The proxy connects from the APIForge server, where localhost means the server itself, so it cannot reach your dev machine. A deployment can also block loopback and private ranges."
  },
  {
    question: "What are the three request modes?",
    answer: "Browser sends the request straight from your tab. Proxy sends it through the APIForge server. Auto tries the browser first and switches to the proxy when the browser call fails with a CORS or network error. A timeout does not trigger the fallback."
  },
  {
    question: "What limits does the proxy enforce?",
    answer: "Only http and https, and no TRACE or CONNECT. Metadata and link-local addresses such as 169.254.169.254 are always refused, as are ports used by SSH, SMTP and common databases. The timeout defaults to 10 seconds and caps at 30, bodies are limited to 2 MB, responses to 5 MB, and redirects to 3, each one re-checked. Each IP gets 60 proxy requests per minute."
  },
  {
    question: "How does response validation work?",
    answer: "For JSON responses, APIForge compares the body with the response schema for that status code. It reports wrong types, missing required properties, and fields the schema does not declare. It is a best-effort check on the first few items of an array and nested objects up to 8 levels deep, not a full JSON Schema validator. If the spec has no schema for that status, the check is skipped and says so."
  },
  {
    question: "Which authentication types are supported?",
    answer: "Bearer token, Basic auth and API key, sent as a header or a query parameter. Credentials go in the request you send, and on a cross-origin redirect through the proxy they are removed from the next hop."
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
          inputId="api-testing-url"
          crumb={{ label: "API Testing", href: "/api-testing" }}
          title="Test a REST API online from its OpenAPI spec"
          lede="Paste a spec URL and send real requests to any operation from your browser. If CORS blocks the call, APIForge retries it through its proxy. Each JSON response is checked against the schema in the spec."
          cta="Start testing"
          facts={["Browser · proxy · auto", "Bearer · Basic · API key", "Schema check", "No sign-up"]}
          aside={<RunDemo />}
        />
        <div className={`${styles.container} ${styles.containerAfterHero}`}>

        <section className={styles.articleBody} data-reveal>
          <h2 className={styles.heading2}>How a test request runs</h2>
          <ul className={styles.unorderedList} data-rows>
            <li>The spec is parsed and its operations are listed. Server URLs, parameters and request body shapes come from the file.</li>
            <li>You set path and query values, headers, a body and auth, then send. Auto mode calls the API from your tab first.</li>
            <li>On a CORS or network failure, the same request is retried from the APIForge server.</li>
            <li>The response is shown with status, headers and timing, and a JSON body is compared with the response schema.</li>
          </ul>
          <p className={styles.paragraph}>
            For what to assert beyond status codes, read{" "}
            <Link className={styles.inlineLink} href="/guides/api-testing-best-practices">API testing best practices</Link>.
            To turn a spec into a test matrix, see{" "}
            <Link className={styles.inlineLink} href="/guides/generate-test-cases-from-openapi">generating test cases from an OpenAPI spec</Link>.
          </p>
        </section>

        <section className={styles.articleBody} data-reveal>
          <h2 className={styles.heading2}>Related tools and guides</h2>
          <ul className={styles.unorderedList} data-rows>
            <li><Link className={styles.inlineLink} href="/openapi-validator">OpenAPI validator</Link> to check the spec before you test it</li>
            <li><Link className={styles.inlineLink} href="/api-score">API quality score</Link> for the design of the same spec</li>
            <li><Link className={styles.inlineLink} href="/guides/validate-api-response-against-openapi-schema">Validate API responses against your OpenAPI schema</Link></li>
          </ul>
        </section>

        <FAQSection faqs={faqs} />
        </div>
      </ProductMotion>
      <LandingFooter />
    </div>
  );
}
