import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGlossaryBySlug, getAllGlossary } from "@/lib/content/loader";
import { createGlossaryMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import ArticleCodeBlock from "@/components/content/ArticleCodeBlock";
import ArticleCTA from "@/components/content/ArticleCTA";
import FAQSection from "@/components/content/FAQSection";
import ShareButtons from "@/components/content/ShareButtons";
import styles from "@/components/content/content.module.css";


export async function generateStaticParams() {
  return getAllGlossary().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const entry = getGlossaryBySlug(params.slug);
  if (!entry) return {};
  return createGlossaryMetadata(entry);
}

export default function GlossaryDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const entry = getGlossaryBySlug(params.slug);
  if (!entry) {
    notFound();
  }

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Glossary", url: "/glossary" },
    { name: entry.term, url: `/glossary/${entry.slug}` },
  ]);

  const faqJsonLd = generateFaqJsonLd(entry.faqs);

  return (
    <div className={styles.pageWrap}>
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
      <main className={styles.container}>
        <Breadcrumbs
          items={[
            { label: "Glossary", href: "/glossary" },
            { label: entry.term, href: `/glossary/${entry.slug}` },
          ]}
        />
        <header className={styles.header}>
          <span className={styles.categoryBadge}>{entry.category.toUpperCase()}</span>
          <h1 className={styles.title}>What is {entry.term}?</h1>
          <p className={styles.description}>{entry.definition}</p>
        </header>

        <section className={styles.articleBody}>
          <h2 className={styles.heading2}>Detailed Explanation</h2>
          <p className={styles.paragraph}>{entry.detailedExplanation}</p>

          {entry.codeExample && (
            <>
              <h2 className={styles.heading2}>Code Example</h2>
              <ArticleCodeBlock
                language={entry.codeExample.language}
                code={entry.codeExample.code}
                caption={entry.codeExample.caption}
              />
            </>
          )}

          {entry.commonMistakes.length > 0 && (
            <>
              <h2 className={styles.heading2}>Common Mistakes to Avoid</h2>
              <ul className={styles.unorderedList}>
                {entry.commonMistakes.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        {entry.relatedToolHref && (
          <ArticleCTA
            title={entry.relatedToolTitle || "Check your API contract with APIForge"}
            buttonText="Try Tool Now"
            href={entry.relatedToolHref}
          />
        )}

        <ShareButtons
          title={`What is ${entry.term}? API Glossary`}
          url={`https://apiforge.info/glossary/${entry.slug}`}
        />

        <FAQSection faqs={entry.faqs} />
      </main>
      <LandingFooter />
    </div>
  );
}
