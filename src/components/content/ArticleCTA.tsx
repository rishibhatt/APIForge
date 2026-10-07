import Link from "next/link";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./content.module.css";

export interface ArticleCTAProps {
  title?: string;
  description?: string;
  buttonText?: string;
  href?: string;
}

/** The article's single way back into the product: tonal panel, one primary gradient action. */
export default function ArticleCTA({
  title = "Score and validate your own API",
  description = "Paste an OpenAPI or Swagger URL into APIForge for a 0–100 quality score, schema linting, and request testing without CORS errors.",
  buttonText = "Open APIForge",
  href = "/api-score",
}: ArticleCTAProps) {
  return (
    <aside className={styles.ctaCard}>
      <div className={styles.ctaContent}>
        <p className={styles.ctaTitle}>{title}</p>
        {description && <p className={styles.ctaDescription}>{description}</p>}
      </div>
      <Link href={href} className={styles.ctaButton}>
        {buttonText}
        <MaterialIcon name="arrow_forward" size="sm" />
      </Link>
    </aside>
  );
}
