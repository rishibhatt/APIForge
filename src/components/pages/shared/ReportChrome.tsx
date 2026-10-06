"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { TranslateFn } from "@/context/LanguageContext";
import styles from "./ReportChrome.module.css";

export { styles as reportStyles };

export type Crumb = { label: string; href?: string };

/** Translate with an English fallback for keys not yet in en.json (t returns the key when missing). */
export function tx(t: TranslateFn, key: string, fallback: string, vars?: Record<string, string | number>): string {
  const out = t(key, vars);
  if (out !== key) return out;
  if (!vars) return fallback;
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), fallback);
}

export type FlashState = "idle" | "done" | "failed";

/** Short-lived action feedback (copied / exported), auto-resets after `ms`. */
export function useFlash(ms = 2000): [FlashState, (next: Exclude<FlashState, "idle">) => void] {
  const [state, setState] = useState<FlashState>("idle");
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );
  const flash = useCallback(
    (next: Exclude<FlashState, "idle">) => {
      setState(next);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("idle"), ms);
    },
    [ms],
  );
  return [state, flash];
}

/** Site header + centered content column shared by the analysis and auto-fix pages. */
export function ReportLayout({ t, children }: { t: TranslateFn; children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <LandingHeader t={t} minimal />
      <main className={styles.main}>{children}</main>
    </div>
  );
}

/**
 * Breadcrumb trail. The first crumb is the way out and gets a back arrow, so
 * on mobile (where middle crumbs hide) there is always one obvious exit.
 */
export function ReportBreadcrumbs({ crumbs, ariaLabel }: { crumbs: Crumb[]; ariaLabel: string }) {
  return (
    <nav aria-label={ariaLabel} className={styles.crumbs}>
      <ol className={styles.crumbList}>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li
              key={`${c.label}-${i}`}
              className={`${styles.crumb} ${i > 0 && !last ? styles.crumbMiddle : ""}`}
            >
              {i > 0 ? (
                <MaterialIcon name="chevron_right" size="xs" className={styles.crumbSep} />
              ) : null}
              {c.href && !last ? (
                <Link href={c.href} className={`${styles.crumbLink} focusRing`}>
                  {i === 0 ? (
                    <MaterialIcon name="arrow_back" size="xs" className={styles.crumbBack} />
                  ) : null}
                  {c.label}
                </Link>
              ) : (
                <span className={styles.crumbCurrent} aria-current={last ? "page" : undefined}>
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ReportHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderText}>
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
        {meta ? <div className={styles.meta}>{meta}</div> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

/** State block for missing sessions, empty results and filter misses. */
export function ReportState({
  icon,
  title,
  body,
  actions,
  compact = false,
  tone = "neutral",
}: {
  icon: string;
  title: string;
  body?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success" ? styles.stateSuccess : tone === "warning" ? styles.stateWarning : "";
  return (
    <div
      className={`${styles.state} ${compact ? styles.stateCompact : ""} ${toneClass}`}
      role="status"
    >
      <div className={styles.stateHead}>
        <span className={styles.stateIcon}>
          <MaterialIcon name={icon} size="sm" />
        </span>
        <h2 className={styles.stateTitle}>{title}</h2>
      </div>
      {body ? <p className={styles.stateBody}>{body}</p> : null}
      {actions ? <div className={styles.stateActions}>{actions}</div> : null}
    </div>
  );
}

/** Loading placeholder shaped like the page, shown for the one frame before session storage is read. */
export function ReportSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label={label}>
      <span className={`${styles.skel} ${styles.skelCrumb}`} />
      <span className={`${styles.skel} ${styles.skelTitle}`} />
      <span className={`${styles.skel} ${styles.skelLine}`} />
      <div className={styles.skelGrid}>
        <span className={`${styles.skel} ${styles.skelBlock}`} />
        <span className={`${styles.skel} ${styles.skelBlock}`} />
      </div>
      <span className={`${styles.skel} ${styles.skelRows}`} />
    </div>
  );
}
