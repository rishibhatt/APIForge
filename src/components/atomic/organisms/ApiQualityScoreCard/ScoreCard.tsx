"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { ApiScoreResult } from "@/lib/api-quality-score/types";
import { SCORE_CATEGORY_MAX } from "@/lib/api-quality-score/types";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { TranslateFn } from "@/context/LanguageContext";
import { useAnimatedScoreNumbers } from "@/hooks/useAnimatedScoreNumbers";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import styles from "./ScoreCard.module.css";

const RING_R = 46;
const RING_C = 2 * Math.PI * RING_R;

const BREAKDOWN_KEYS = [
  { key: "naming" as const, labelKey: "qualityScore.breakdown.naming" },
  { key: "http" as const, labelKey: "qualityScore.breakdown.http" },
  { key: "structure" as const, labelKey: "qualityScore.breakdown.structure" },
  {
    key: "consistency" as const,
    labelKey: "qualityScore.breakdown.consistency",
  },
  {
    key: "versioning" as const,
    labelKey: "qualityScore.breakdown.versioning",
  },
  {
    key: "errorHandling" as const,
    labelKey: "qualityScore.breakdown.errors",
  },
  {
    key: "documentation" as const,
    labelKey: "qualityScore.breakdown.docs",
  },
];

function tierStyle(score: number): CSSProperties {
  if (score >= 80) {
    return { ["--circle-accent" as string]: "var(--color-method-get)" };
  }
  if (score >= 50) {
    return { ["--circle-accent" as string]: "var(--color-method-put-patch)" };
  }
  return { ["--circle-accent" as string]: "var(--color-error)" };
}

export interface ScoreCardProps {
  t: TranslateFn;
  result: ApiScoreResult;
  topIssueCount?: number;
  variant?: "default" | "modal";
  animate?: boolean;
  onRoastApi?: () => void;
  onViewFullAnalysis?: () => void;
  onContinueWorkspace?: () => void;
}

export default function ScoreCard({
  t,
  result,
  topIssueCount = 3,
  variant = "default",
  animate = true,
  onRoastApi,
  onViewFullAnalysis,
  onContinueWorkspace,
}: ScoreCardProps) {
  const { totalScore, breakdown, issues } = result;
  const previewIssues = issues.slice(0, topIssueCount);
  const reducedMotion = usePrefersReducedMotion();
  const runAnim = animate && !reducedMotion;

  const breakdownStable = useMemo(
    () => ({ ...breakdown }),
    [breakdown],
  );

  const { total: animTotal, breakdown: animBreakdown } = useAnimatedScoreNumbers(
    totalScore,
    breakdownStable,
    950,
    runAnim,
  );

  const displayTotal = runAnim ? animTotal : Math.round(totalScore);
  const displayBreakdown = runAnim ? animBreakdown : breakdown;
  const ringPct = Math.min(100, Math.max(0, displayTotal)) / 100;
  const ringOffset = RING_C * (1 - ringPct);

  const cardClass =
    variant === "modal" ? `${styles.card} ${styles.cardModal}` : styles.card;

  return (
    <article
      className={cardClass}
      style={tierStyle(totalScore)}
    >
      <div className={styles.inner}>
        <div className={styles.headerRow}>
          <div className={styles.titleBlock}>
            <h2 className={styles.title}>{t("qualityScore.title")}</h2>
            <p className={styles.subtitle}>{t("qualityScore.subtitle")}</p>
          </div>
          <div
            className={styles.scoreCircleWrap}
            aria-label={t("qualityScore.ariaScore")}
          >
            <svg
              className={styles.ringSvg}
              viewBox="0 0 120 120"
              aria-hidden
            >
              <g transform="rotate(-90 60 60)">
                <circle
                  className={styles.ringTrack}
                  cx={60}
                  cy={60}
                  r={RING_R}
                  fill="none"
                  strokeWidth={10}
                />
                <circle
                  className={styles.ringProgress}
                  cx={60}
                  cy={60}
                  r={RING_R}
                  fill="none"
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringOffset}
                />
              </g>
            </svg>
            <div className={styles.scoreCircleInner}>
              <span className={styles.scoreValue}>{displayTotal}</span>
              <span className={styles.scoreDenom}>/ 100</span>
            </div>
          </div>
        </div>

        <div className={styles.breakdown}>
          <p className={styles.breakdownTitle}>{t("qualityScore.breakdownTitle")}</p>
          {BREAKDOWN_KEYS.map(({ key, labelKey }) => {
            const earned = displayBreakdown[key];
            const max = SCORE_CATEGORY_MAX[key];
            const pct = max > 0 ? Math.min(100, (earned / max) * 100) : 0;
            return (
              <div key={key} className={styles.row}>
                <span className={styles.rowLabel}>{t(labelKey)}</span>
                <span className={styles.rowNums}>
                  {earned}/{max}
                </span>
                <div className={styles.track}>
                  <div className={styles.fill} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {previewIssues.length > 0 ? (
          <div>
            <p className={styles.breakdownTitle}>{t("qualityScore.topIssues")}</p>
            <ul className={styles.issues}>
              {previewIssues.map((issue, i) => (
                <li
                  key={`${issue.message}-${i}`}
                  className={`${styles.issueItem} ${
                    issue.severity === "high"
                      ? styles.issueHigh
                      : issue.severity === "medium"
                        ? styles.issueMed
                        : ""
                  }`}
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.ctaRow}>
          {onRoastApi ? (
            <button
              type="button"
              className={`${styles.ctaPrimary} focusRing`}
              style={{
                background: "linear-gradient(135deg, #ff6b57 0%, #ff523b 100%)",
                border: "none",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(255, 107, 87, 0.35)",
              }}
              onClick={onRoastApi}
            >
              Roast This API
            </button>
          ) : null}
          {onViewFullAnalysis ? (
            <button
              type="button"
              className={`${styles.ctaPrimary} focusRing`}
              onClick={onViewFullAnalysis}
            >
              {t("qualityScore.ctaAnalysis")}
              <MaterialIcon name="arrow_forward" size="sm" aria-hidden />
            </button>
          ) : null}
          {onContinueWorkspace ? (
            <button
              type="button"
              className={`${styles.ctaGhost} focusRing`}
              onClick={onContinueWorkspace}
            >
              {t("qualityScore.ctaWorkspace")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
