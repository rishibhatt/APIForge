import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getComparisonBySlug, getAllComparisons } from "@/lib/content/loader";
import { createComparisonMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import ArticleCTA from "@/components/content/ArticleCTA";
import FAQSection from "@/components/content/FAQSection";
import ShareButtons from "@/components/content/ShareButtons";
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
      <main className={styles.container}>
        <Breadcrumbs
          items={[
            { label: "Compare", href: "/compare" },
            { label: comparison.title, href: `/compare/${comparison.slug}` },
          ]}
        />
        <header className={styles.header}>
          <span className={styles.categoryBadge}>FEATURE COMPARISON</span>
          <h1 className={styles.title}>{comparison.title}</h1>
          <p className={styles.description}>{comparison.description}</p>
        </header>

        <section className={styles.articleBody}>
          <div className={`${styles.callout} ${styles.callout_info}`}>
            <h3 className={styles.calloutTitle}>Verdict Summary</h3>
            <p className={styles.calloutText}>{comparison.verdict}</p>
          </div>

          <h2 className={styles.heading2}>Capability Breakdown</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>APIForge</th>
                  <th>{comparison.competitorName}</th>
                  <th>Notes</th>
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
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>APIForge Approach</th>
                      <th>{comparison.competitorName} Approach</th>
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
          buttonText="Explore APIForge Workbench"
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
