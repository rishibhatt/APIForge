import type { Metadata } from "next";
import Link from "next/link";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateOrganizationJsonLd, generatePersonJsonLd, generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { CANONICAL_AUTHOR } from "@/lib/content/author";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ArticleHero from "@/components/content/ArticleHero";
import styles from "@/components/content/content.module.css";


export const metadata: Metadata = createBaseMetadata({
  title: "About APIForge",
  description: "APIForge is a free, open-source browser workspace to parse, test, score and generate from OpenAPI and Swagger specs. Built by Rishab Bhatt.",
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
      <ArticleHero
        breadcrumbs={[{ label: "About", href: "/about" }]}
        title={<>About APIForge</>}
        description={
          <>
            A free, open-source browser workspace for OpenAPI and Swagger specs: paste a URL, then
            run, score, and generate from it in one tab.
          </>
        }
      />
      <main className={`${styles.container} ${styles.containerAfterHero}`}>
        <section className={styles.articleBody}>
          <h2 className={styles.heading2}>What it is</h2>
          <p className={styles.paragraph}>
            APIForge turns an OpenAPI 3 or Swagger 2 spec into a live workspace. You browse operations
            by tag, send real requests (from the browser, through a proxy, or automatically falling
            back between the two), check responses against the schema, grade the API design, and
            generate code from the same spec. There is no install and no account.
          </p>
          <p className={styles.paragraph}>
            It exists because understanding an unfamiliar API usually means juggling Swagger UI,
            Postman, a linter, and a type generator. APIForge keeps all four scoped to the endpoint
            in front of you.
          </p>

          <h2 className={styles.heading2}>What it does today</h2>
          <ul className={styles.unorderedList}>
            <li>
              <strong>Parse:</strong> raw JSON or YAML links and hosted Swagger UI pages, with $ref
              pointers resolved.
            </li>
            <li>
              <strong>Run:</strong> live requests with Bearer, Basic, or API-key auth, and an
              SSRF-guarded proxy for CORS-blocked calls.
            </li>
            <li>
              <strong>Score:</strong> a deterministic 0–100 quality score across seven design pillars,
              with an auto-fix preview of REST-aligned paths.
            </li>
            <li>
              <strong>Generate:</strong> TypeScript interfaces, IDE prompts, schema-valid payloads, and
              test suites, using AI models on Groq.
            </li>
            <li>
              <strong>Export:</strong> cURL, JavaScript fetch, JSON, and Postman collections.
            </li>
          </ul>
          <p className={styles.paragraph}>
            Scores and validations are rule-based; AI only assists with generation. Mock servers,
            Postman sync, spec diffing, a CLI, and team workspaces are on the roadmap, not shipped.
          </p>

          <h2 className={styles.heading2}>Who builds it</h2>
          <div className={styles.authorBox}>
            {CANONICAL_AUTHOR.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={CANONICAL_AUTHOR.avatar}
                alt=""
                width={40}
                height={40}
                className={styles.authorAvatarImg}
              />
            ) : (
              <div className={styles.authorAvatar}>R</div>
            )}
            <div className={styles.authorInfo}>
              <div className={styles.authorHeader}>
                <span className={styles.authorName}>{CANONICAL_AUTHOR.name}</span>
                {CANONICAL_AUTHOR.role ? (
                  <span className={styles.authorRole}>{CANONICAL_AUTHOR.role}</span>
                ) : null}
              </div>
              <p className={styles.paragraph}>
                {CANONICAL_AUTHOR.bio ??
                  "APIForge is designed and built by Rishab Bhatt as an open-source project under the MIT license. Issues and pull requests are welcome on GitHub."}
              </p>
              <div className={styles.authorLinks}>
                {CANONICAL_AUTHOR.github ? (
                  <a href={CANONICAL_AUTHOR.github} target="_blank" rel="noopener noreferrer">
                    GitHub
                  </a>
                ) : null}
                {CANONICAL_AUTHOR.linkedin ? (
                  <a href={CANONICAL_AUTHOR.linkedin} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                ) : null}
                {CANONICAL_AUTHOR.x ? (
                  <a href={CANONICAL_AUTHOR.x} target="_blank" rel="noopener noreferrer">
                    X
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Open a spec in APIForge</h2>
            <p className={styles.ctaDescription}>
              Paste an OpenAPI or Swagger URL, or start from the Swagger Petstore sample.
            </p>
          </div>
          <Link href="/#parse-api" className={styles.ctaButton}>
            Open workspace
          </Link>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
