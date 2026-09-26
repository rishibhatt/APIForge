"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import Link from "next/link";
import AppLogo from "@/components/atomic/atoms/AppLogo/AppLogo";
import ThemeToggle from "@/components/atomic/molecules/ThemeToggle/ThemeToggle";
import styles from "./LandingHeader.module.css";

export interface LandingHeaderProps {
  t: TranslateFn;
  /** Hide marketing nav (Features, Workspace, etc.). Use on secondary routes e.g. quality report. */
  minimal?: boolean;
}

const NAV_LINKS: { href: string; labelKey?: string; label?: string; isCoral?: boolean; isNew?: boolean }[] = [
  { href: "#what-apiforge-does", labelKey: "landing.nav.features" },
  { href: "#workspace-showcase", labelKey: "landing.nav.workspace" },
  { href: "#how-it-works", labelKey: "landing.nav.howItWorks" },
  { href: "#playground", labelKey: "landing.nav.playground" },
  { href: "#why-apiforge", labelKey: "landing.nav.why" },
  { href: "/roast-my-api", label: "🔥 Roast My API", isCoral: true, isNew: true },
];

export default function LandingHeader({ t, minimal = false }: LandingHeaderProps) {
  return (
    <header
      className={`${styles.header} ${minimal ? styles.headerMinimal : ""}`}
    >
      <div className={styles.left}>
        {minimal ? (
          <Link
            href="/"
            className={styles.homeLink}
            aria-label={t("qualityScore.analysis.homeLinkLabel")}
          >
            <span className={styles.homeLinkInner} aria-hidden>
              <AppLogo size={66} maxWidth={200} priority className={styles.brandLogo} />
              <span className={styles.brand}>{t("common.appName")}</span>
            </span>
          </Link>
        ) : (
          <Link href="/" className={styles.homeLink} aria-label={t("landing.navHomeAria")}>
            <span className={styles.homeLinkInner}>
              <AppLogo size={66} maxWidth={200} priority className={styles.brandLogo} />
              <span className={styles.brand}>{t("common.appName")}</span>
            </span>
          </Link>
        )}
      </div>
      {!minimal ? (
        <nav className={styles.nav} aria-label={t("landing.navAria")}>
          <ul className={styles.navList}>
            {NAV_LINKS.map(({ href, labelKey, label, isCoral, isNew }) => (
              <li key={href}>
                <Link
                  className={`${styles.navLink} ${isCoral ? styles.coralNavLink : ""}`}
                  href={href}
                >
                  <span>{label || (labelKey ? t(labelKey) : "")}</span>
                  {isNew ? <span className={styles.newBadge}>NEW</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <span className={styles.navSpacer} aria-hidden />
      )}
      <div className={styles.right}>
        <ThemeToggle t={t} variant="icon" />
      </div>
    </header>
  );
}
