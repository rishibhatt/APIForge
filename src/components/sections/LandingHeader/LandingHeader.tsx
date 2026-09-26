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

const fallbackT = (k: string) => (k === "common.appName" ? "APIForge" : k);

const NAV_LINKS: { href: string; labelKey?: string; label?: string; isCoral?: boolean; isNew?: boolean; showFire?: boolean }[] = [
  { href: "/#what-apiforge-does", labelKey: "landing.nav.features" },
  { href: "/#workspace-showcase", labelKey: "landing.nav.workspace" },
  { href: "/#how-it-works", labelKey: "landing.nav.howItWorks" },
  { href: "/guides", label: "Guides" },
  { href: "/#why-apiforge", labelKey: "landing.nav.why" },
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
            {NAV_LINKS.map(({ href, labelKey, label, isCoral, isNew, showFire }) => (
              <li key={href}>
                <Link
                  className={`${styles.navLink} ${isCoral ? styles.coralNavLink : ""}`}
                  href={href}
                >
                  <span>
                    {showFire ? "🔥 " : null}
                    {label || (labelKey ? t(labelKey) : "")}
                  </span>
                  {isNew ? <span className={styles.newBadge}>NEW</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.right}>
          <ThemeToggle t={t} variant="icon" />
        </div>
      </div>
    </header>
  );
}
