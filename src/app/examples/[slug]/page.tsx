import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getExampleBySlug, getAllExamples } from "@/lib/content/loader";
import { createExampleMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import ArticleCodeBlock from "@/components/content/ArticleCodeBlock";
import ArticleCTA from "@/components/content/ArticleCTA";
import ShareButtons from "@/components/content/ShareButtons";
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
      <main className={styles.container}>
        <Breadcrumbs
          items={[
            { label: "Examples", href: "/examples" },
            { label: example.title, href: `/examples/${example.slug}` },
          ]}
        />
        <header className={styles.header}>
          <span className={styles.categoryBadge}>{example.category.toUpperCase()}</span>
          <h1 className={styles.title}>{example.title}</h1>
          <p className={styles.description}>{example.description}</p>
        </header>

        <section className={styles.articleBody}>
          <h2 className={styles.heading2}>Problem Statement</h2>
          <p className={styles.paragraph}>{example.problemStatement}</p>

          <div className={`${styles.callout} ${styles.callout_danger}`}>
            <h3 className={styles.calloutTitle}>❌ Anti-Pattern / Bad Implementation</h3>
            <p className={styles.calloutText}>{example.badExample.explanation}</p>
          </div>
          <ArticleCodeBlock
            language={example.badExample.language}
            code={example.badExample.code}
            filename="bad-pattern.yaml"
          />

          <div className={`${styles.callout} ${styles.callout_tip}`}>
            <h3 className={styles.calloutTitle}>✓ Refactored / Recommended Implementation</h3>
            <p className={styles.calloutText}>{example.goodExample.explanation}</p>
          </div>
          <ArticleCodeBlock
            language={example.goodExample.language}
            code={example.goodExample.code}
            filename="good-pattern.yaml"
          />

          <h2 className={styles.heading2}>How APIForge Checks This</h2>
          <ul className={styles.unorderedList}>
            {example.apiforgeChecks.map((check, i) => (
              <li key={i}>{check}</li>
            ))}
          </ul>
        </section>

        <ArticleCTA
          title="Test your own OpenAPI specification against these checks"
          buttonText="Run API Score Check"
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
