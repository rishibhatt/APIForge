import Link from "next/link";
import type { ContentBlock, KnowledgeItem } from "@/content/types";
import { getAuthor } from "@/content/authors";
import { getKnowledgeItemBySlug } from "@/content/registry";
import { getAllGuides, getRelatedContent } from "@/lib/content/loader";
import { BreadcrumbItem } from "./Breadcrumbs";
import ArticleHero from "./ArticleHero";
import ArticleAuthor from "./ArticleAuthor";
import ArticleContent, { renderInline } from "./ArticleContent";
import RelatedArticles, { RelatedItem } from "./RelatedArticles";
import FAQSection from "./FAQSection";
import ShareButtons from "./ShareButtons";
import ArticleCTA from "./ArticleCTA";
import TableOfContents from "./TableOfContents";
import { TYPE_LABELS, TYPE_PATHS, byNewest, formatLabel, headingAnchor } from "./labels";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import styles from "./content.module.css";

export interface ArticleLayoutProps {
  article: KnowledgeItem;
}

type ToolBlock = Extract<ContentBlock, { type: "tool" | "cta" }>;
type ExternalRefBlock = Extract<ContentBlock, { type: "externalReference" }>;
type RelatedBlock = Extract<ContentBlock, { type: "relatedContent" }>;

const TAG_LABELS: Record<string, string> = {
  guide: "Guide",
  glossary: "Glossary",
  example: "Example",
  comparison: "Comparison",
  checklist: "Checklist",
  reference: "Reference",
  "tool-guide": "Guide",
};

export default function ArticleLayout({ article }: ArticleLayoutProps) {
  const author = getAuthor(article.author);
  const pathPrefix = TYPE_PATHS[article.type];
  const canonicalUrl = `https://apiforge.info${pathPrefix}/${article.slug}`;
  const blocks = article.blocks ?? [];

  const breadcrumbs: BreadcrumbItem[] = [
    { label: TYPE_LABELS[article.type], href: pathPrefix },
    { label: article.title, href: `${pathPrefix}/${article.slug}` },
  ];

  // Table of contents from the same h2 blocks ArticleContent renders (same anchor ids).
  const toc: Array<{ id: string; label: string }> = [];
  for (const block of blocks) {
    if (block.type === "heading" && block.level === 2) {
      toc.push({ id: headingAnchor(block.text, block.id), label: block.text });
    }
  }
  const hasFaqs = Boolean(article.faqs && article.faqs.length > 0);
  if (hasFaqs && toc.length > 0) toc.push({ id: "faq", label: "FAQ" });
  const showToc = toc.length > 2;

  // End matter is hoisted out of the body so each appears once, in a fixed order.
  const toolBlock = blocks.find((b): b is ToolBlock => b.type === "tool" || b.type === "cta");
  const sources = blocks.filter((b): b is ExternalRefBlock => b.type === "externalReference");
  const curatedSlugs = blocks
    .filter((b): b is RelatedBlock => b.type === "relatedContent")
    .flatMap((b) => b.slugs);

  const relatedItems: RelatedItem[] = [];
  const seen = new Set<string>([`${pathPrefix}/${article.slug}`]);
  const pushRelated = (item: RelatedItem) => {
    if (seen.has(item.href) || relatedItems.length >= 5) return;
    seen.add(item.href);
    relatedItems.push(item);
  };
  for (const slug of curatedSlugs) {
    const item = getKnowledgeItemBySlug(slug);
    if (item) pushRelated({ href: `${TYPE_PATHS[item.type]}/${item.slug}`, title: item.title, tag: TAG_LABELS[item.type] });
  }
  const graph = getRelatedContent(article.slug);
  for (const g of graph.guides) pushRelated({ href: `/guides/${g.slug}`, title: g.title, tag: "Guide" });
  if (graph.glossary) pushRelated({ href: `/glossary/${graph.glossary.slug}`, title: `What is ${graph.glossary.term}?`, tag: "Glossary" });
  if (graph.example) pushRelated({ href: `/examples/${graph.example.slug}`, title: graph.example.title, tag: "Example" });

  // Previous / next guide in the same order as the guides index (newest first).
  let prev: { href: string; title: string } | null = null;
  let next: { href: string; title: string } | null = null;
  if (article.type === "guide") {
    const ordered = [...getAllGuides()].sort(byNewest);
    const i = ordered.findIndex((g) => g.slug === article.slug);
    if (i > 0) prev = { href: `/guides/${ordered[i - 1].slug}`, title: ordered[i - 1].title };
    if (i >= 0 && i < ordered.length - 1) next = { href: `/guides/${ordered[i + 1].slug}`, title: ordered[i + 1].title };
  }

  // The short answer repeats the description on guides; only show it when it adds something.
  const showAnswer = Boolean(article.answerFirst && article.answerFirst.trim() !== article.description.trim());

  const cta = toolBlock
    ? { title: toolBlock.title, description: toolBlock.description, buttonText: toolBlock.buttonText, href: toolBlock.href }
    : article.tool
      ? { title: article.tool.title, description: undefined, buttonText: "Open the tool", href: article.tool.href }
      : null;

  return (
    <div className={styles.pageWrap}>
      <LandingHeader minimal />
      <ArticleHero
        wide
        image={article.heroImage ? { src: article.heroImage, alt: "" } : undefined}
        breadcrumbs={breadcrumbs}
        title={article.title}
        description={article.description}
        meta={
          <ArticleAuthor
            author={author}
            publishedAt={article.publishedAt}
            updatedAt={article.updatedAt}
            readingTime={article.readingTime}
            topic={formatLabel(article.cluster)}
            topicHref={article.type === "guide" ? `/guides?topic=${article.cluster}` : undefined}
          />
        }
      />

      <main className={`${styles.container} ${styles.containerWide} ${styles.containerAfterHero}`}>
        <div className={`${styles.articleGrid} ${showToc ? "" : styles.articleGridSolo}`}>
          <article className={styles.articleMain}>
            {showToc && (
              <details className={styles.tocMobile}>
                <summary className={styles.tocMobileSummary}>
                  <span>On this page</span>
                  <MaterialIcon name="expand_more" className={styles.tocMobileChevron} />
                </summary>
                <ul className={styles.tocMobileList}>
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className={styles.tocLink}>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {showAnswer && (
              <aside className={styles.answerFirst} aria-label="Short answer">
                <p className={styles.answerLabel}>Short answer</p>
                <p className={styles.answerText}>{renderInline(article.answerFirst as string)}</p>
              </aside>
            )}

            <div className={styles.articleBodyContainer}>
              <ArticleContent blocks={blocks} hoistEndMatter />
            </div>

            {cta && (
              <ArticleCTA title={cta.title} description={cta.description} buttonText={cta.buttonText} href={cta.href} />
            )}

            {hasFaqs && <FAQSection faqs={article.faqs} />}

            {sources.length > 0 && (
              <section className={styles.sources} aria-labelledby="sources-heading">
                <h2 id="sources-heading" className={styles.endHeading}>Sources</h2>
                <ol className={styles.sourceList}>
                  {sources.map((s) => (
                    <li key={s.url} className={styles.sourceItem}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                        {s.title}
                      </a>
                      <span className={styles.sourceOrigin}>{renderInline(s.source)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <ShareButtons title={article.title} url={canonicalUrl} />

            <RelatedArticles items={relatedItems} />

            {(prev || next) && (
              <nav className={styles.pager} aria-label="More guides">
                {prev ? (
                  <Link href={prev.href} className={styles.pagerLink} rel="prev">
                    <span className={styles.pagerLabel}>
                      <MaterialIcon name="arrow_back" size="sm" />
                      Previous
                    </span>
                    <span className={styles.pagerTitle}>{prev.title}</span>
                  </Link>
                ) : (
                  <span className={styles.pagerSpacer} aria-hidden />
                )}
                {next && (
                  <Link href={next.href} className={`${styles.pagerLink} ${styles.pagerNext}`} rel="next">
                    <span className={styles.pagerLabel}>
                      Next
                      <MaterialIcon name="arrow_forward" size="sm" />
                    </span>
                    <span className={styles.pagerTitle}>{next.title}</span>
                  </Link>
                )}
              </nav>
            )}
          </article>

          {showToc && (
            <aside className={styles.tocAside}>
              <TableOfContents items={toc} />
            </aside>
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
