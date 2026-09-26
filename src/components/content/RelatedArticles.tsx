import Link from "next/link";
import type { Article, GlossaryEntry, OpenApiExample } from "@/content/types";
import styles from "./content.module.css";

export interface RelatedArticlesProps {
  guides?: Article[];
  glossary?: GlossaryEntry;
  example?: OpenApiExample;
}

export default function RelatedArticles({ guides = [], glossary, example }: RelatedArticlesProps) {
  return (
    <section className={styles.relatedSection}>
      <h3 className={styles.relatedHeading}>Related Resources</h3>
      <div className={styles.relatedGrid}>
        {guides.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className={styles.relatedCard}>
            <span className={styles.relatedTag}>{g.category.toUpperCase()}</span>
            <h4 className={styles.relatedTitle}>{g.title}</h4>
            <p className={styles.relatedExcerpt}>{g.excerpt}</p>
          </Link>
        ))}

        {glossary && (
          <Link href={`/glossary/${glossary.slug}`} className={`${styles.relatedCard} ${styles.relatedGlossary}`}>
            <span className={styles.relatedTag}>GLOSSARY</span>
            <h4 className={styles.relatedTitle}>What is {glossary.term}?</h4>
            <p className={styles.relatedExcerpt}>{glossary.definition}</p>
          </Link>
        )}

        {example && (
          <Link href={`/examples/${example.slug}`} className={`${styles.relatedCard} ${styles.relatedExample}`}>
            <span className={styles.relatedTag}>CODE EXAMPLE</span>
            <h4 className={styles.relatedTitle}>{example.title}</h4>
            <p className={styles.relatedExcerpt}>{example.description}</p>
          </Link>
        )}
      </div>
    </section>
  );
}
