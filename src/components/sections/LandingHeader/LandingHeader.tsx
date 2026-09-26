"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import Link from "next/link";
import AppLogo from "@/components/atomic/atoms/AppLogo/AppLogo";
import ThemeToggle from "@/components/atomic/molecules/ThemeToggle/ThemeToggle";
import styles from "./LandingHeader.module.css";

export interface LandingHeaderProps {
  t?: TranslateFn;
  /** Hide marketing nav (Features, Workspace, etc.). Use on secondary routes e.g. quality report. */
  minimal?: boolean;
}

const DEFAULT_NAV_LABELS: Record<string, string> = {
  "common.appName": "APIForge",
  "landing.nav.features": "Features",
  "landing.nav.workspace": "Workspace",
  "landing.nav.howItWorks": "How It Works",
  "landing.nav.why": "Why APIForge",
  "landing.nav.guides": "Guides",
  "landing.navAria": "Main Navigation",
  "landing.navHomeAria": "APIForge Homepage",
};

const fallbackT = (k: string) => DEFAULT_NAV_LABELS[k] || k;

const NAV_LINKS: { href: string; label: string; labelKey?: string; isCoral?: boolean; isNew?: boolean; showFire?: boolean }[] = [
  { href: "/#what-apiforge-does", label: "Features", labelKey: "landing.nav.features" },
  { href: "/#workspace-showcase", label: "Workspace", labelKey: "landing.nav.workspace" },
  { href: "/#how-it-works", label: "How It Works", labelKey: "landing.nav.howItWorks" },
  { href: "/guides", label: "Guides", labelKey: "landing.nav.guides" },
  { href: "/#why-apiforge", label: "Why APIForge", labelKey: "landing.nav.why" },
  { href: "/roast-my-api", label: "Roast My API", isCoral: true, isNew: true, showFire: true },
];

export default function LandingHeader({ t = fallbackT, minimal = false }: LandingHeaderProps) {
  return (
    <header
      className={`${styles.header} ${minimal ? styles.headerMinimal : ""}`}
    >
      <div className={styles.headerInner}>
        <div className={styles.left}>
          <Link href="/" className={styles.homeLink} aria-label={t("landing.navHomeAria")}>
            <span className={styles.homeLinkInner}>
              <AppLogo size={66} maxWidth={200} priority className={styles.brandLogo} />
              <span className={styles.brand}>{t("common.appName")}</span>
            </span>
          </Link>
        </div>

        <nav className={styles.nav} aria-label={t("landing.navAria")}>
          <ul className={styles.navList}>
            {NAV_LINKS.map(({ href, labelKey, label, isCoral, isNew, showFire }) => {
              const translated = labelKey ? t(labelKey) : undefined;
              const textToDisplay = (translated && translated !== labelKey) ? translated : label;

              return (
                <li key={href}>
                  <Link
                    className={`${styles.navLink} ${isCoral ? styles.coralNavLink : ""}`}
                    href={href}
                  >
                    <span>
                      {showFire ? "🔥 " : null}
                      {textToDisplay}
                    </span>
                    {isNew ? <span className={styles.newBadge}>NEW</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.right}>
          <ThemeToggle t={t} variant="icon" />
        </div>
      </div>
    </header>
  );
}
