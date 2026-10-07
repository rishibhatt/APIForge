import type { ReactNode } from "react";
import Breadcrumbs, { BreadcrumbItem } from "./Breadcrumbs";
import styles from "./content.module.css";

export interface ArticleHeroProps {
  breadcrumbs: BreadcrumbItem[];
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  /** Align with the wide article grid (title column + table of contents). */
  wide?: boolean;
  /** Faint engineering grid behind the header; index/hub pages only. */
  backdrop?: boolean;
  /** Optional cover image shown under the byline. */
  image?: { src: string; alt: string };
}

/** Page header for reading surfaces: breadcrumbs, title, lede, then metadata and byline below. */
export default function ArticleHero({
  breadcrumbs,
  title,
  description,
  meta,
  wide = false,
  backdrop = false,
  image,
}: ArticleHeroProps) {
  return (
    <header className={`${styles.hero} ${backdrop ? styles.heroBackdrop : ""}`}>
      {backdrop && <div className={`gridBackdrop ${styles.heroGrid}`} aria-hidden />}
      <div className={`${styles.heroInner} ${wide ? styles.heroInnerWide : ""}`}>
        <Breadcrumbs items={breadcrumbs} />
        <h1 className={styles.heroTitle}>{title}</h1>
        {description && <p className={styles.heroDescription}>{description}</p>}
        {meta && <div className={styles.heroMeta}>{meta}</div>}
        {image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={image.src} alt={image.alt} className={styles.heroImage} loading="eager" decoding="async" />
        )}
      </div>
    </header>
  );
}
