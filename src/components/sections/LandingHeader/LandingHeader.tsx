"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import ThemeToggle from "@/components/atomic/molecules/ThemeToggle/ThemeToggle";
import styles from "./LandingHeader.module.css";

export interface LandingHeaderProps {
  t: TranslateFn;
}

const NAV_LINKS: { href: string; labelKey: string }[] = [
  { href: "#what-apiforge-does", labelKey: "landing.nav.features" },
  { href: "#workspace-showcase", labelKey: "landing.nav.workspace" },
  { href: "#how-it-works", labelKey: "landing.nav.howItWorks" },
  { href: "#playground", labelKey: "landing.nav.playground" },
];

export default function LandingHeader({ t }: LandingHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.brand}>{t("common.appName")}</span>
      </div>
      <nav className={styles.nav} aria-label={t("landing.navAria")}>
        <ul className={styles.navList}>
          {NAV_LINKS.map(({ href, labelKey }) => (
            <li key={href}>
              <a className={styles.navLink} href={href}>
                {t(labelKey)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.right}>
        <a className={styles.openApp} href="#parse-api">
          {t("landing.nav.openApp")}
        </a>
        <ThemeToggle t={t} variant="icon" />
      </div>
    </header>
  );
}
