import Link from "next/link";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./content.module.css";

export interface ContentIndexItem {
  href: string;
  title: string;
  description: string;
  meta?: Array<string | undefined>;
}

export interface ContentIndexProps {
  items: ContentIndexItem[];
  /** Group rows under A–Z letter headings (glossary). Items should arrive sorted by title. */
  groupByLetter?: boolean;
  /** Accessible name for the list. */
  label?: string;
}

function Row({ item, level = 2 }: { item: ContentIndexItem; level?: 2 | 3 }) {
  const Title = level === 2 ? "h2" : "h3";
  const meta = (item.meta ?? []).filter((m): m is string => Boolean(m));
  return (
    <li className={styles.indexItem}>
      <Link href={item.href} className={styles.indexLink}>
        <div className={styles.indexMain}>
          <Title className={styles.indexTitle}>{item.title}</Title>
          <span className={styles.indexDesc}>{item.description}</span>
        </div>
        {meta.length > 0 && (
          <span className={styles.indexMeta}>
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </span>
        )}
        <MaterialIcon name="arrow_forward" size="sm" className={styles.rowArrow} />
      </Link>
    </li>
  );
}

/** Editorial index: one row per entry with title, one-line summary, mono metadata, whole-row hover. */
export default function ContentIndex({ items, groupByLetter = false, label }: ContentIndexProps) {
  if (!groupByLetter) {
    return (
      <ul className={styles.indexList} aria-label={label}>
        {items.map((item) => (
          <Row key={item.href} item={item} />
        ))}
      </ul>
    );
  }

  const groups = new Map<string, ContentIndexItem[]>();
  for (const item of items) {
    const first = item.title.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : "#";
    const bucket = groups.get(letter) ?? [];
    bucket.push(item);
    groups.set(letter, bucket);
  }
  const letters = Array.from(groups.keys());

  return (
    <div className={styles.indexGrouped}>
      {letters.length > 3 && (
        <nav className={styles.letterNav} aria-label="Jump to letter">
          {letters.map((l) => (
            <a key={l} href={`#letter-${l}`} className={styles.letterLink}>
              {l}
            </a>
          ))}
        </nav>
      )}
      {letters.map((l) => (
        <section key={l} className={styles.letterGroup} aria-labelledby={`letter-${l}`}>
          <h2 id={`letter-${l}`} className={styles.letterHeading}>
            {l}
          </h2>
          <ul className={styles.indexList}>
            {(groups.get(l) ?? []).map((item) => (
              <Row key={item.href} item={item} level={3} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
