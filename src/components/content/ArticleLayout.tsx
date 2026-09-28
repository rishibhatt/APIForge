import type { KnowledgeItem } from "@/content/types";
import { getAuthor } from "@/content/authors";
import { getRelatedContent } from "@/lib/content/loader";
import Breadcrumbs, { BreadcrumbItem } from "./Breadcrumbs";
import ArticleAuthor from "./ArticleAuthor";
import ArticleContent from "./ArticleContent";
import RelatedArticles from "./RelatedArticles";
import FAQSection from "./FAQSection";
import ShareButtons from "./ShareButtons";
import ArticleCTA from "./ArticleCTA";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import styles from "./content.module.css";

export interface ArticleLayoutProps {
  article: KnowledgeItem;
}

export default function ArticleLayout({ article }: ArticleLayoutProps) {
  const author = getAuthor(article.author);
  const pathPrefix = article.type === "glossary" ? "/glossary"
    : article.type === "example" ? "/examples"
    : article.type === "comparison" ? "/compare"
    : article.type === "checklist" ? "/checklists"
    : article.type === "reference" ? "/reference"
    : "/guides";

  const canonicalUrl = `https://apiforge.info${pathPrefix}/${article.slug}`;
  const related = getRelatedContent(article.slug);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: article.type.toUpperCase(), href: pathPrefix },
    { label: article.cluster.toUpperCase(), href: `${pathPrefix}?cluster=${article.cluster}` },
    { label: article.title, href: `${pathPrefix}/${article.slug}` },
  ];

  return (
    <div className={styles.pageWrap}>
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs items={breadcrumbs} />

        <header className={styles.header}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            <span className={styles.categoryBadge}>{article.type.toUpperCase()}</span>
            <span className={`${styles.categoryBadge} ${styles.categoryBadgeAlt}`}>
              CLUSTER: {article.cluster.toUpperCase()}
            </span>
          </div>
          <h1 className={styles.title}>{article.title}</h1>
          <p className={styles.description}>{article.description}</p>
        </header>

        <ArticleAuthor
          author={author}
          publishedAt={article.publishedAt}
          updatedAt={article.updatedAt}
          readingTime={article.readingTime}
        />

        {/* Answer-First / TL;DR Banner */}
        {article.answerFirst && (
          <div className={`${styles.callout} ${styles.callout_info}`} style={{ marginBottom: "32px" }}>
            <div className={styles.calloutTitle}>⚡ Direct Answer / Key Takeaway</div>
            <div className={styles.calloutText}>{article.answerFirst}</div>
          </div>
        )}

        <div className={styles.articleBodyContainer}>
          <ArticleContent blocks={article.blocks} />
        </div>

        {/* Primary Tool CTA */}
        {article.tool ? (
          <ArticleCTA
            title={article.tool.title}
            buttonText={article.tool.buttonText}
            href={article.tool.href}
          />
        ) : (
          <ArticleCTA />
        )}

        <ShareButtons title={article.title} url={canonicalUrl} />

        {article.faqs && article.faqs.length > 0 && (
          <FAQSection faqs={article.faqs} />
        )}

        <RelatedArticles
          guides={related.guides}
          glossary={related.glossary}
          example={related.example}
        />
      </main>

      <footer className={styles.articleFooterNote}>
        <div className={styles.articleFooterNoteInner}>
          <p>
            <strong>Built with APIForge:</strong> The AI-native API quality, OpenAPI validation, and API engineering workbench.{" "}
            <a href="https://apiforge.info">Explore tools at apiforge.info</a>.
          </p>
        </div>
      </footer>

      <LandingFooter />
    </div>
  );
}
