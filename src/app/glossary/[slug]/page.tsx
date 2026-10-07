import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGlossaryBySlug, getAllGlossary } from "@/lib/content/loader";
import { createGlossaryMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ArticleHero from "@/components/content/ArticleHero";
import ArticleCodeBlock from "@/components/content/ArticleCodeBlock";
import ArticleCTA from "@/components/content/ArticleCTA";
import FAQSection from "@/components/content/FAQSection";
import ShareButtons from "@/components/content/ShareButtons";
import RichParagraphs from "@/components/content/RichText";
import { renderInline } from "@/components/content/ArticleContent";
import MetaRow from "@/components/content/MetaRow";
import { formatDate, formatLabel } from "@/components/content/labels";
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
      <ArticleHero
        breadcrumbs={[
            { label: "Glossary", href: "/glossary" },
            { label: entry.term, href: `/glossary/${entry.slug}` },
          ]}
        title={<>What is {entry.term}?</>}
        description={<>{entry.definition}</>}
        meta={
          <MetaRow
            items={[
              "Glossary",
              formatLabel(entry.category),
              <>
                {entry.updatedAt && entry.updatedAt !== entry.publishedAt ? "Updated " : "Published "}
                <time dateTime={entry.updatedAt ?? entry.publishedAt}>
                  {formatDate(entry.updatedAt ?? entry.publishedAt)}
                </time>
              </>,
            ]}
          />
        }
      />
      <main className={`${styles.container} ${styles.containerAfterHero}`}>

        <section className={styles.articleBody}>
          <h2 className={styles.heading2}>How it works</h2>
          <RichParagraphs text={entry.detailedExplanation} className={styles.paragraph} />

          {entry.codeExample && (
            <>
              <h2 className={styles.heading2}>Example</h2>
              <ArticleCodeBlock
                language={entry.codeExample.language}
                code={entry.codeExample.code}
                caption={entry.codeExample.caption}
              />
            </>
          )}

          {entry.commonMistakes.length > 0 && (
            <>
              <h2 className={styles.heading2}>Common mistakes</h2>
              <ul className={styles.unorderedList}>
                {entry.commonMistakes.map((m, i) => (
                  <li key={i}>{renderInline(m)}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        {entry.relatedToolHref && (
          <ArticleCTA
            title={entry.relatedToolTitle || "Check your API contract with APIForge"}
            buttonText="Open the tool"
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
