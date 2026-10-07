import styles from "./SectionHead.module.css";

export interface SectionHeadProps {
  id: string;
  title: string;
  lede: string;
}

/** The one section header used across the landing page: centered title plus a one-line lede. */
export default function SectionHead({ id, title, lede }: SectionHeadProps) {
  return (
    <header className={styles.head}>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      <p className={styles.lede}>{lede}</p>
    </header>
  );
}
