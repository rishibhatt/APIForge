import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getExampleBySlug, getAllExamples } from "@/lib/content/loader";
import { createExampleMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ArticleHero from "@/components/content/ArticleHero";
import ArticleCodeBlock from "@/components/content/ArticleCodeBlock";
import ArticleCTA from "@/components/content/ArticleCTA";
import ShareButtons from "@/components/content/ShareButtons";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import MetaRow from "@/components/content/MetaRow";
import { formatDate, formatLabel } from "@/components/content/labels";
import styles from "@/components/content/content.module.css";


export async function generateStaticParams() {
  return getAllExamples().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const example = getExampleBySlug(params.slug);
  if (!example) return {};
  return createExampleMetadata(example);
}

export default function ExampleDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const example = getExampleBySlug(params.slug);
  if (!example) {
    notFound();
  }

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Examples", url: "/examples" },
    { name: example.title, url: `/examples/${example.slug}` },
  ]);

  return (
    <div className={styles.pageWrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <LandingHeader minimal />
      <ArticleHero
        breadcrumbs={[
            { label: "Examples", href: "/examples" },
            { label: example.title, href: `/examples/${example.slug}` },
          ]}
        title={<>{example.title}</>}
        description={<>{example.description}</>}
        meta={
          <MetaRow
            items={[
              "Example",
              formatLabel(example.category),
              <>
                {example.updatedAt && example.updatedAt !== example.publishedAt ? "Updated " : "Published "}
                <time dateTime={example.updatedAt ?? example.publishedAt}>
                  {formatDate(example.updatedAt ?? example.publishedAt)}
                </time>
              </>,
            ]}
          />
        }
      />
      <main className={`${styles.container} ${styles.containerAfterHero}`}>

        <section className={styles.articleBody}>
          <h2 className={styles.heading2}>The problem</h2>
          <p className={styles.paragraph}>{example.problemStatement}</p>

          <section className={styles.exampleBlock} aria-labelledby="example-avoid">
            <h3 id="example-avoid" className={styles.exampleHead}>
              <span className={`${styles.exampleVerdict} ${styles.exampleVerdictBad}`}>
                <MaterialIcon name="cancel" size="sm" />
                Avoid
              </span>
              <span className={styles.exampleTitle}>The anti-pattern</span>
            </h3>
            <ArticleCodeBlock
              language={example.badExample.language}
              code={example.badExample.code}
              filename={`bad-pattern.${example.badExample.language === "json" ? "json" : "yaml"}`}
            />
            <p className={styles.exampleExplain}>{example.badExample.explanation}</p>
          </section>

          <section className={styles.exampleBlock} aria-labelledby="example-prefer">
            <h3 id="example-prefer" className={styles.exampleHead}>
              <span className={`${styles.exampleVerdict} ${styles.exampleVerdictGood}`}>
                <MaterialIcon name="check_circle" size="sm" />
                Prefer
              </span>
              <span className={styles.exampleTitle}>The refactored version</span>
            </h3>
            <ArticleCodeBlock
              language={example.goodExample.language}
              code={example.goodExample.code}
              filename={`good-pattern.${example.goodExample.language === "json" ? "json" : "yaml"}`}
            />
            <p className={styles.exampleExplain}>{example.goodExample.explanation}</p>
          </section>

          <h2 className={styles.heading2}>How APIForge checks this</h2>
          <ul className={styles.unorderedList}>
            {example.apiforgeChecks.map((check, i) => (
              <li key={i}>{check}</li>
            ))}
          </ul>
        </section>

        <ArticleCTA
          title="Test your own OpenAPI specification against these checks"
          buttonText="Score your spec"
          href="/api-score"
        />

        <ShareButtons
          title={example.title}
          url={`https://apiforge.info/examples/${example.slug}`}
        />
      </main>
      <LandingFooter />
    </div>
  );
}
