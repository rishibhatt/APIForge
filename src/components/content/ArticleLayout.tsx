import type { Article } from "@/content/types";
import { getAuthor } from "@/lib/content/author";
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
  article: Article;
}

export default function ArticleLayout({ article }: ArticleLayoutProps) {
  const author = getAuthor(article.author);
  const canonicalUrl = `https://apiforge.info/guides/${article.slug}`;
  const related = getRelatedContent(article.slug, article.tags, article.category);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Guides", href: "/guides" },
    { label: article.category.toUpperCase(), href: `/guides?category=${article.category}` },
    { label: article.title, href: `/guides/${article.slug}` },
  ];

  return (
    <div className={styles.pageWrap}>
      <LandingHeader minimal />
      <main className={styles.container}>
        <Breadcrumbs items={breadcrumbs} />

        <header className={styles.header}>
          <span className={styles.categoryBadge}>{article.category.toUpperCase()}</span>
          <h1 className={styles.title}>{article.title}</h1>
          <p className={styles.description}>{article.description}</p>
        </header>

        <ArticleAuthor
          author={author}
          publishedAt={article.publishedAt}
          updatedAt={article.updatedAt}
          readingTime={article.readingTime}
        />

        <div className={styles.articleBodyContainer}>
          <ArticleContent blocks={article.content} />
        </div>

        <ArticleCTA />

        <ShareButtons title={article.title} url={canonicalUrl} />

        <FAQSection faqs={article.faqs} />

        <RelatedArticles
          guides={related.guides}
          glossary={related.glossary}
          example={related.example}
        />
      </main>

      <footer className={styles.articleFooterNote}>
        <div className={styles.articleFooterNoteInner}>
          <p>
            <strong>Built with APIForge:</strong> APIForge helps developers analyze API quality, OpenAPI specifications, and API design issues online.{" "}
            <a href="https://apiforge.info">Learn more at apiforge.info</a>.
          </p>
        </div>
      </footer>

      <LandingFooter />
    </div>
  );
}
