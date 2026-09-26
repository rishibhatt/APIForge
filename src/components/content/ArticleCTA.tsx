import Link from "next/link";
import styles from "./content.module.css";

export interface ArticleCTAProps {
  title?: string;
  description?: string;
  buttonText?: string;
  href?: string;
}

export default function ArticleCTA({
  title = "Ready to score and validate your API?",
  description = "Paste any OpenAPI specification URL or YAML file into APIForge for instant 0-100 quality scoring, schema linting, and zero-CORS proxy testing.",
  buttonText = "Try APIForge Workbench",
  href = "/api-score",
}: ArticleCTAProps) {
  return (
    <div className={styles.ctaCard}>
      <div className={styles.ctaContent}>
        <h3 className={styles.ctaTitle}>{title}</h3>
        <p className={styles.ctaDescription}>{description}</p>
      </div>
      <Link href={href} className={styles.ctaButton}>
        {buttonText} →
      </Link>
    </div>
  );
}
