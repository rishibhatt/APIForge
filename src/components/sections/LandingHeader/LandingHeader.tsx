"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import type { TranslateFn } from "@/context/LanguageContext";
import Image from "next/image";
import Link from "next/link";
import AppLogo from "@/components/atomic/atoms/AppLogo/AppLogo";
import ThemeToggle from "@/components/atomic/molecules/ThemeToggle/ThemeToggle";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { isRoastPath } from "@/components/providers/ZoneController";
import { ROAST_LOGO_PATH } from "@/constants/assets";
import styles from "./LandingHeader.module.css";

export interface LandingHeaderProps {
  t?: TranslateFn;
  /** Kept for API compatibility; secondary routes now share the full nav. */
  minimal?: boolean;
}

const GITHUB_REPO_HREF = "https://github.com/rishibhatt/APIForge";

const DEFAULT_LABELS: Record<string, string> = {
  "common.appName": "APIForge",
  "a11y.themeSwitchToLight": "Switch to light theme",
  "a11y.themeSwitchToDark": "Switch to dark theme",
};

const fallbackT = (k: string) => DEFAULT_LABELS[k] || k;

const NAV_LINKS: { href: string; label: string; isNew?: boolean; roast?: boolean }[] = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/guides", label: "Guides" },
  { href: "/roast-my-api", label: "Roast my API", isNew: true, roast: true },
];

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** Roast-zone brand mark: logo-fire.png from public images. */
function FireMark({ size }: { size: number }) {
  return (
    <span className={styles.fireMark} style={{ width: size, height: size }} aria-hidden>
      <Image
        src={ROAST_LOGO_PATH}
        alt=""
        width={size}
        height={size}
        className={styles.fireMarkImg}
        priority
      />
    </span>
  );
}

export default function LandingHeader({ t = fallbackT }: LandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const isActive = (href: string) =>
    !href.startsWith("/#") && pathname != null && pathname.startsWith(href);

  const appName = t("common.appName");
  const roastZone = isRoastPath(pathname);

  return (
    <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.homeLink} aria-label={`${appName} home`}>
          {roastZone ? (
            <FireMark size={30} />
          ) : (
            <AppLogo size={30} maxWidth={30} priority className={styles.brandLogo} />
          )}
          <span className={styles.brand}>{appName}</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Main">
          <ul className={styles.navList}>
            {NAV_LINKS.map(({ href, label, isNew, roast }) => (
              <li key={href}>
                <Link
                  className={`${styles.navLink} ${roast ? styles.roastLink : ""}`}
                  href={href}
                  aria-current={isActive(href) || (roast && roastZone) ? "page" : undefined}
                >
                  {roast ? <span className={styles.fireEmoji} aria-hidden>🔥</span> : null}
                  {label}
                  {isNew ? <span className={styles.newBadge}>New</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.right}>
          <a
            className={styles.iconLink}
            href={GITHUB_REPO_HREF}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="APIForge on GitHub"
          >
            <GitHubIcon />
          </a>
          <ThemeToggle t={t} variant="icon" />
          <button
            type="button"
            className={styles.mobileMenuToggle}
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <MaterialIcon name={mobileMenuOpen ? "close" : "menu"} size="md" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && mounted
        ? createPortal(
            <div className={styles.mobileBackdrop} onClick={() => setMobileMenuOpen(false)}>
              <div
                className={styles.mobileDrawer}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation"
              >
                <div className={styles.drawerHeader}>
                  <span className={styles.homeLink}>
                    {roastZone ? (
                      <FireMark size={28} />
                    ) : (
                      <AppLogo size={28} maxWidth={28} className={styles.brandLogo} />
                    )}
                    <span className={styles.brand}>{appName}</span>
                  </span>
                  <button
                    type="button"
                    className={styles.mobileMenuToggle}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <MaterialIcon name="close" size="md" />
                  </button>
                </div>

                <nav aria-label="Main">
                  <ul className={styles.drawerNavList}>
                    {NAV_LINKS.map(({ href, label, isNew, roast }) => (
                      <li key={href}>
                        <Link
                          className={`${styles.drawerNavLink} ${roast ? styles.roastLink : ""}`}
                          href={href}
                          aria-current={isActive(href) || (roast && roastZone) ? "page" : undefined}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {roast ? <span className={styles.fireEmoji} aria-hidden>🔥</span> : null}
                          {label}
                          {isNew ? <span className={styles.newBadge}>New</span> : null}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <a
                        className={styles.drawerNavLink}
                        href={GITHUB_REPO_HREF}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        GitHub
                      </a>
                    </li>
                  </ul>
                </nav>

              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
