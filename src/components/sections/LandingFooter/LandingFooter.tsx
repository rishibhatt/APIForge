"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import styles from "./LandingFooter.module.css";

const LINKEDIN_HREF =
  "https://www.linkedin.com/in/rishab-bhatt-7ba7111ab/";
const X_HREF = "https://x.com/Rishi_o07";

export interface LandingFooterProps {
  t: TranslateFn;
}

export default function LandingFooter({ t }: LandingFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <p className={styles.line}>
        <span>© {year}</span>
        <span className={styles.sep} aria-hidden>
          ·
        </span>
        <span>{t("landing.footer.madeBy")}</span>
        <span className={styles.sep} aria-hidden>
          ·
        </span>
        <a
          className={styles.link}
          href={LINKEDIN_HREF}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("landing.footer.linkedin")}
        </a>
        <span className={styles.sep} aria-hidden>
          ·
        </span>
        <a
          className={styles.link}
          href={X_HREF}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("landing.footer.x")}
        </a>
      </p>
    </footer>
  );
}
