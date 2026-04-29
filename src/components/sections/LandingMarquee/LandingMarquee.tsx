"use client";

import { useMemo } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import styles from "./LandingMarquee.module.css";

export interface LandingMarqueeProps {
  t: TranslateFn;
  /** Optional wrapper class (e.g. hero spacing). */
  className?: string;
}

export default function LandingMarquee({ t, className }: LandingMarqueeProps) {
  const chips = useMemo(
    () =>
      t("landing.marketing.marqueeChips")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean),
    [t],
  );

  if (chips.length === 0) return null;

  return (
    <div className={`${styles.marqueeBand} ${className ?? ""}`.trim()}>
      <div className={styles.marqueeFadeLeft} aria-hidden />
      <div className={styles.marqueeFadeRight} aria-hidden />
      <div className={styles.marqueeViewport}>
        <div className={styles.marqueeTrack}>
          {[0, 1].flatMap((cycle) =>
            chips.map((text, i) => (
              <span
                key={`m-${cycle}-${i}-${text}`}
                className={styles.marqueeChip}
              >
                {text}
              </span>
            )),
          )}
        </div>
      </div>
    </div>
  );
}
