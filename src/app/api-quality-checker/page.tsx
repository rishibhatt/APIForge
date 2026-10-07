import type { Metadata } from "next";
import Link from "next/link";
import { createToolMetadata } from "@/lib/seo/metadata";
import { generateSoftwareApplicationJsonLd, generateBreadcrumbJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ToolHero from "@/components/sections/LandingMarketing/ToolHero";
import ProductMotion from "@/components/sections/LandingMarketing/ProductMotion";
import { ScoreDemo } from "@/components/sections/LandingMarketing/Demos";
import FAQSection from "@/components/content/FAQSection";
import styles from "@/components/content/content.module.css";


export const metadata: Metadata = createToolMetadata(
  "API Quality Checker",
  "API Quality Checker and REST API Linter",
  "Lint an OpenAPI or Swagger spec online. Get a per-route list of REST design issues, with severity and a suggested fix, for naming, verbs, errors and versioning.",
  "/api-quality-checker",
  [
    "api quality checker",
    "rest api linter",
    "openapi linter online",
    "api design linter",
    "api linter online",
    "openapi design checker",
    "rest api best practices checker",
  ]
);

const faqs = [
  {
    question: "What does a REST API linter check?",
    answer: "A linter reads the spec and flags design problems without calling the API. This one checks path naming (camelCase, underscores, verbs), GET requests with a body, path depth, missing 2xx and error responses, missing summaries, missing version segments, singular and plural mixing, and duplicate operations."
  },
  {
    question: "How is this different from Spectral?",
    answer: "Spectral runs a ruleset you configure and can be wired into CI. APIForge runs one fixed set of rules in the browser and shows the results next to the operations. There is no ruleset file, no way to switch rules off, and no CLI yet. Use APIForge for a quick review and a linter in CI for enforcement."
  },
  {
    question: "What do the severities mean?",
    answer: "High marks problems that break REST semantics or the spec itself: a verb segment in a path, a GET with a body, a duplicate operation. Medium marks missing responses, a missing version segment, deep nesting and naming style. Low marks underscores and missing summaries."
  },
  {
    question: "What naming convention does it expect?",
    answer: "Kebab-case, plural nouns for collections, and HTTP methods for the action. So GET /user-groups/{id}/members, not GET /getUserGroupMembers. The API naming conventions guide explains the reasoning."
  },
  {
    question: "Why is a GET with a request body flagged?",
    answer: "HTTP does not define semantics for a GET body. Proxies, caches and some client libraries drop it. The suggested fix is a POST for complex queries, or query parameters for simple filters."
  },
  {
    question: "Does it check that my OpenAPI file is valid?",
    answer: "No. It lints the design of the operations it can extract. It does not check schema types, security schemes or examples, and it does not report line numbers. The OpenAPI validator shows whether the file parses and its references resolve."
  },
  {
    question: "Can I run it in CI?",
    answer: "Not yet. A CLI is on the roadmap but not shipped. Today the checker runs in the browser: paste a spec URL and read the issue list."
  },
  {
    question: "Is it free, and is my spec stored?",
    answer: "It is free, needs no account and is open source under the MIT license. The parse request fetches the spec on the server, returns the operations to your browser and does not save the spec."
  }
];

const rules: { rule: string; severity: string; fix: string }[] = [
  { rule: "Verb-like segment in a path (get, create, update, delete, list, save...)", severity: "High", fix: "Use a noun and the HTTP method: DELETE /users/{id}" },
  { rule: "GET operation with a request body", severity: "High", fix: "Use POST, or move filters to query parameters" },
  { rule: "Duplicate method and path", severity: "High", fix: "Remove the repeated operation" },
  { rule: "camelCase in a path", severity: "Medium", fix: "Rename to kebab-case: /user-profile" },
  { rule: "Action verb in the path that conflicts with the method (create, update, delete, remove)", severity: "Medium", fix: "POST /users instead of POST /users/create" },
  { rule: "Path deeper than 4 segments", severity: "Medium", fix: "Flatten the resource chain" },
  { rule: "No 2xx response documented", severity: "Medium", fix: "Document 200 or 201 with a schema" },
  { rule: "No 4xx, 5xx or default response documented", severity: "Medium", fix: "Add 400, 404 and 500 or default" },
  { rule: "No URL path version segment anywhere", severity: "Medium", fix: "Add /v1 or document a version header" },
  { rule: "Singular and plural of the same word across paths", severity: "Medium", fix: "Standardize on plural nouns" },
  { rule: "Underscore in a path segment", severity: "Low", fix: "/user_profile to /user-profile" },
  { rule: "Operation without a summary or description", severity: "Low", fix: "Add a summary to each operation" },
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
          inputId="api-quality-checker-url"
          crumb={{ label: "API Quality Checker", href: "/api-quality-checker" }}
          title="API quality checker and REST API linter"
          lede="Paste an OpenAPI or Swagger URL and get a per-route list of REST design issues. Each one names the operation, carries a severity and suggests a fix. The same rules produce the 0–100 score."
          cta="Check my API"
          facts={["Rule-based, not AI", "Per-route issues", "Fix preview", "OpenAPI 3.x · Swagger 2.0"]}
          aside={<ScoreDemo />}
        />
        <div className={`${styles.container} ${styles.containerAfterHero}`}>

        <section className={styles.articleBody} data-reveal>
          <h2 className={styles.heading2}>Rules the linter runs</h2>
          <p className={styles.paragraph}>
            The rule set is fixed. These are the checks that produce an issue, with the severity attached to each.
          </p>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Severity</th>
                  <th>Suggested fix</th>
                </tr>
              </thead>
              <tbody data-rows>
                {rules.map((r) => (
                  <tr key={r.rule}>
                    <td>{r.rule}</td>
                    <td>{r.severity}</td>
                    <td>{r.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.paragraph}>
            The <Link className={styles.inlineLink} href="/guides/api-quality-checklist">API quality checklist</Link> explains why each check matters.
          </p>
        </section>

        <section className={styles.articleBody} data-reveal>
          <h2 className={styles.heading2}>Related tools and guides</h2>
          <ul className={styles.unorderedList} data-rows>
            <li><Link className={styles.inlineLink} href="/api-score">API quality score</Link> for the 0–100 total and per-rule points</li>
            <li><Link className={styles.inlineLink} href="/openapi-validator">OpenAPI validator</Link> to check that the file parses</li>
            <li><Link className={styles.inlineLink} href="/guides/api-naming-conventions">API naming conventions</Link></li>
            <li><Link className={styles.inlineLink} href="/guides/rest-api-error-handling">REST API error handling</Link></li>
          </ul>
        </section>

        <FAQSection faqs={faqs} />
        </div>
      </ProductMotion>
      <LandingFooter />
    </div>
  );
}
