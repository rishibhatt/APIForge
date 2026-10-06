import Link from "next/link";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./content.module.css";

export interface RelatedItem {
  href: string;
  title: string;
  tag: string;
}

/** End-of-article reading list: mono type tag, title, whole-row hover. */
export default function RelatedArticles({ items }: { items: RelatedItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className={styles.relatedSection} aria-labelledby="related-heading">
      <h2 id="related-heading" className={styles.endHeading}>Keep reading</h2>
      <ul className={styles.relatedList}>
        {items.map((item) => (
          <li key={item.href} className={styles.relatedItem}>
            <Link href={item.href} className={styles.relatedLink}>
              <span className={styles.relatedTag}>{item.tag}</span>
              <span className={styles.relatedTitle}>{item.title}</span>
              <MaterialIcon name="arrow_forward" size="sm" className={styles.rowArrow} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
