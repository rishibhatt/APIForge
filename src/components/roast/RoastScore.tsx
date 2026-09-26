"use client";

import { useEffect, useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { RoastPersonality, RoastStatusTier } from "@/lib/roast/types";
import styles from "./RoastScore.module.css";

export interface RoastScoreProps {
  score: number;
  statusTier?: RoastStatusTier;
  personality?: RoastPersonality;
  verdict: string;
  totalEndpoints: number;
  totalFindings: number;
  patternsCount: number;
}

const RING_R = 64;
const RING_C = 2 * Math.PI * RING_R;

export default function RoastScore({
  score,
  statusTier,
  personality,
  verdict,
  totalEndpoints,
  totalFindings,
  patternsCount,
}: RoastScoreProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1200; // ms

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(easedProgress * score));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [score]);

  const pct = Math.min(100, Math.max(0, displayScore)) / 100;
  const offset = RING_C * (1 - pct);

  const calculatedTier: RoastStatusTier =
    statusTier ||
    (score >= 85
      ? "HEALTHY"
      : score >= 70
        ? "QUESTIONABLE"
        : score >= 50
          ? "CHAOTIC"
          : score >= 30
            ? "CRIMINAL"
            : "NUCLEAR");

  const tierClass =
    calculatedTier === "HEALTHY"
      ? styles.tierHealthy
      : calculatedTier === "QUESTIONABLE"
        ? styles.tierNeedsWork
        : styles.tierTalk;

  return (
    <div className={styles.container}>
      <span className={styles.judgedKicker}>YOUR API HAS BEEN JUDGED.</span>

      <div className={styles.scoreCircleWrap}>
        <div className={styles.glow} />
        <svg className={styles.ringSvg} viewBox="0 0 160 160">
          <g transform="rotate(-90 80 80)">
            <circle
              className={styles.ringTrack}
              cx={80}
              cy={80}
              r={RING_R}
              fill="none"
              strokeWidth={12}
            />
            <circle
              className={styles.ringProgress}
              cx={80}
              cy={80}
              r={RING_R}
              fill="none"
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={offset}
            />
          </g>
        </svg>

        <div className={styles.scoreInner}>
          <span className={styles.scoreNum}>{displayScore}</span>
          <span className={styles.denom}>/ 100</span>
        </div>
      </div>

      <div className={styles.verdictBox}>
        <div className={styles.badgeRow}>
          <span className={`${styles.tierBadge} ${tierClass}`}>{calculatedTier}</span>
          {personality ? (
            <span className={styles.personalityBadge}>Personality: {personality}</span>
          ) : null}
        </div>

        <h2 className={styles.verdictQuote}>&quot;{verdict}&quot;</h2>
        <span className={styles.categoriesSub}>BASED ON 7 API QUALITY CATEGORIES</span>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <MaterialIcon name="api" size="sm" />
            {totalEndpoints} endpoints
          </span>
          <span className={styles.dot} />
          <span className={styles.metaItem}>
            <MaterialIcon name="bug_report" size="sm" />
            {totalFindings} issues
          </span>
          <span className={styles.dot} />
          <span className={styles.metaItem}>
            <MaterialIcon name="schema" size="sm" />
            {patternsCount} patterns
          </span>
        </div>
      </div>
    </div>
  );
}
