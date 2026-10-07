import Link from "next/link";
import styles from "./content.module.css";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/** Trail with mono separators; wraps on narrow screens and truncates the current page title. */
export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbsNav}>
      <ol className={styles.breadcrumbsList}>
        <li className={styles.breadcrumbItem}>
          <Link href="/" className={styles.breadcrumbLink}>
            Home
          </Link>
        </li>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={item.href} className={`${styles.breadcrumbItem} ${isLast ? styles.breadcrumbItemLast : ""}`}>
              <span className={styles.breadcrumbSep} aria-hidden>
                /
              </span>
              {isLast ? (
                <span className={styles.breadcrumbCurrent} aria-current="page" title={item.label}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className={styles.breadcrumbLink}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
