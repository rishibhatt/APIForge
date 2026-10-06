import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getComparisonBySlug, getAllComparisons } from "@/lib/content/loader";
import { createComparisonMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import ArticleHero from "@/components/content/ArticleHero";
import ArticleCTA from "@/components/content/ArticleCTA";
import FAQSection from "@/components/content/FAQSection";
import ShareButtons from "@/components/content/ShareButtons";
import MetaRow from "@/components/content/MetaRow";
import { formatDate } from "@/components/content/labels";
import styles from "@/components/content/content.module.css";


export async function generateStaticParams() {
  return getAllComparisons().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const comparison = getComparisonBySlug(params.slug);
  if (!comparison) return {};
  return createComparisonMetadata(comparison);
}

export default function ComparisonDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const comparison = getComparisonBySlug(params.slug);
  if (!comparison) {
    notFound();
  }

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Compare", url: "/compare" },
    { name: comparison.title, url: `/compare/${comparison.slug}` },
  ]);

  const faqJsonLd = generateFaqJsonLd(comparison.faqs);

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
            { label: "Compare", href: "/compare" },
            { label: comparison.title, href: `/compare/${comparison.slug}` },
          ]}
        title={<>{comparison.title}</>}
        description={<>{comparison.description}</>}
        meta={
          <MetaRow
            items={[
              "Comparison",
              `APIForge vs ${comparison.competitorName}`,
              <>
                {comparison.updatedAt && comparison.updatedAt !== comparison.publishedAt ? "Updated " : "Published "}
                <time dateTime={comparison.updatedAt ?? comparison.publishedAt}>
                  {formatDate(comparison.updatedAt ?? comparison.publishedAt)}
                </time>
              </>,
            ]}
          />
        }
      />
      <main className={`${styles.container} ${styles.containerAfterHero}`}>

        <section className={styles.articleBody}>
          <aside className={styles.answerFirst} aria-label="Verdict">
            <p className={styles.answerLabel}>Verdict</p>
            <p className={styles.answerText}>{comparison.verdict}</p>
          </aside>

          <h2 className={styles.heading2}>Capability breakdown</h2>
          <div className={styles.tableWrapper} tabIndex={0} role="region" aria-label="Capability breakdown">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">APIForge</th>
                  <th scope="col">{comparison.competitorName}</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {comparison.featuresTable.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.feature}</strong></td>
                    <td>{row.apiforge}</td>
                    <td>{row.competitor}</td>
                    <td>{row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {comparison.sections.map((section, idx) => (
            <div key={idx}>
              <h2 className={styles.heading2}>{section.title}</h2>
              <p className={styles.paragraph}>{section.description}</p>
              <div className={styles.tableWrapper} tabIndex={0} role="region" aria-label={section.title}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">APIForge approach</th>
                      <th scope="col">{comparison.competitorName} approach</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{section.apiforgeWay}</td>
                      <td>{section.competitorWay}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        <ArticleCTA
          title="Try APIForge directly in your browser"
          buttonText="Open workspace"
          href="/api-score"
        />

        <ShareButtons
          title={comparison.title}
          url={`https://apiforge.info/compare/${comparison.slug}`}
        />

        <FAQSection faqs={comparison.faqs} />
      </main>
      <LandingFooter />
    </div>
  );
}
