"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import type { ApiScoreResult } from "@/lib/api-quality-score/types";
import { SCORE_CATEGORY_MAX } from "@/lib/api-quality-score/types";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import ScoreGauge from "@/components/score/ScoreGauge";
import { toast } from "@/components/providers/Toaster/toast";
import type { TranslateFn } from "@/context/LanguageContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import styles from "./ScoreCard.module.css";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const BREAKDOWN_KEYS = [
  { key: "naming" as const, labelKey: "qualityScore.breakdown.naming" },
  { key: "http" as const, labelKey: "qualityScore.breakdown.http" },
  { key: "structure" as const, labelKey: "qualityScore.breakdown.structure" },
  { key: "consistency" as const, labelKey: "qualityScore.breakdown.consistency" },
  { key: "versioning" as const, labelKey: "qualityScore.breakdown.versioning" },
  { key: "errorHandling" as const, labelKey: "qualityScore.breakdown.errors" },
  { key: "documentation" as const, labelKey: "qualityScore.breakdown.docs" },
];

/** Translate with an English fallback for keys not yet in en.json (t returns the key when missing). */
function tx(t: TranslateFn, key: string, fallback: string): string {
  const out = t(key);
  return out === key ? fallback : out;
}

function gradeFor(score: number, t: TranslateFn): { letter: string; verdict: string; tone: string } {
  if (score >= 90) return { letter: "A", verdict: tx(t, "qualityScore.grade.A", "Excellent"), tone: "var(--color-method-get)" };
  if (score >= 80) return { letter: "B", verdict: tx(t, "qualityScore.grade.B", "Strong"), tone: "var(--color-method-get)" };
  if (score >= 70) return { letter: "C", verdict: tx(t, "qualityScore.grade.C", "Fair"), tone: "var(--color-method-put-patch)" };
  if (score >= 50) return { letter: "D", verdict: tx(t, "qualityScore.grade.D", "Needs work"), tone: "var(--color-method-put-patch)" };
  return { letter: "F", verdict: tx(t, "qualityScore.grade.F", "At risk"), tone: "var(--color-error)" };
}

function pillarTone(ratio: number): string {
  if (ratio >= 0.7) return "var(--color-method-get)";
  if (ratio >= 0.5) return "var(--color-method-put-patch)";
  return "var(--color-error)";
}

function sevClass(sev: "high" | "medium" | "low"): string {
  if (sev === "high") return styles.sevHigh ?? "";
  if (sev === "medium") return styles.sevMed ?? "";
  return styles.sevLow ?? "";
}

/** Per-operation issues are written as "METHOD /path: message". Split the route off so it can render in mono. */
function splitRoute(message: string): { route: string | null; text: string } {
  const m = /^([A-Z]+ \/\S*): (.+)$/.exec(message);
  return m ? { route: m[1] ?? null, text: m[2] ?? message } : { route: null, text: message };
}

export interface ScoreCardProps {
  t: TranslateFn;
  result: ApiScoreResult;
  topIssueCount?: number;
  variant?: "default" | "modal";
  /** Play the gauge / pillar / issue entrance. Reduced motion always shows final values. */
  animate?: boolean;
  /** id for the card heading; the dialog uses it for aria-labelledby. */
  titleId?: string;
  onPreviewAutoFix?: () => void;
  onRoastApi?: () => void;
  onViewFullAnalysis?: () => void;
  onContinueWorkspace?: () => void;
}

export default function ScoreCard({
  t,
  result,
  topIssueCount = 2,
  variant = "default",
  animate = true,
  titleId,
  onPreviewAutoFix,
  onRoastApi,
  onViewFullAnalysis,
  onContinueWorkspace,
}: ScoreCardProps) {
  const { totalScore, breakdown, issues } = result;
  const previewIssues = issues.slice(0, topIssueCount);
  const reducedMotion = usePrefersReducedMotion();
  const runAnim = animate && !reducedMotion;
  const rootRef = useRef<HTMLElement>(null);

  const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));
  const grade = gradeFor(finalScore, t);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !runAnim) return;
    const ctx = gsap.context(() => {
      const fills = root.querySelectorAll<HTMLElement>("[data-fill]");
      const nums = root.querySelectorAll<HTMLElement>("[data-pts]");
      const reveal = root.querySelectorAll<HTMLElement>("[data-reveal]");
      gsap.set(fills, { scaleX: 0 });
      gsap.set(reveal, { opacity: 0, y: 6 });
      fills.forEach((el, i) => {
        const target = Number(el.dataset.fill);
        gsap.to(el, { scaleX: target, duration: 0.8, delay: 0.2 + i * 0.05, ease: "power3.out" });
      });
      nums.forEach((el, i) => {
        const target = Number(el.dataset.pts);
        const p = { v: 0 };
        el.textContent = "0";
        gsap.to(p, {
          v: target,
          duration: 0.8,
          delay: 0.2 + i * 0.05,
          ease: "power3.out",
          onUpdate: () => {
            el.textContent = String(Math.round(p.v));
          },
          onComplete: () => {
            el.textContent = String(target);
          },
        });
      });
      gsap.to(reveal, { opacity: 1, y: 0, duration: 0.4, delay: 0.9, stagger: 0.06, ease: "power2.out" });
    }, root);
    return () => ctx.revert();
  }, [runAnim, finalScore]);

  const copyReport = useCallback(async () => {
    const lines = [
      `${tx(t, "qualityScore.title", "API quality score")}: ${finalScore}/100 (grade ${grade.letter}, ${grade.verdict})`,
      "",
      ...BREAKDOWN_KEYS.map(({ key, labelKey }) => `${t(labelKey)}: ${breakdown[key]}/${SCORE_CATEGORY_MAX[key]}`),
    ];
    if (previewIssues.length > 0) {
      lines.push("", `${t("qualityScore.topIssues")}:`);
      previewIssues.forEach((i) => lines.push(`- [${i.severity}] ${i.message} Fix: ${i.example_fix}`));
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success(tx(t, "qualityScore.report.copied", "Report copied"), { id: "score-report-copy" });
    } catch {
      toast.error(tx(t, "qualityScore.report.copyFailed", "Could not copy the report"), {
        description: tx(t, "qualityScore.report.copyFailedHint", "Your browser blocked clipboard access."),
        id: "score-report-copy",
      });
    }
  }, [t, finalScore, grade.letter, grade.verdict, breakdown, previewIssues]);

  const cardClass = variant === "modal" ? `${styles.card} ${styles.cardModal}` : styles.card;
  const hasActions = onPreviewAutoFix || onViewFullAnalysis || onRoastApi || onContinueWorkspace;

  return (
    <article ref={rootRef} className={cardClass} style={{ ["--tone" as string]: grade.tone } as CSSProperties}>
      <div className={styles.gaugeCol}>
        <div className={styles.headWrap}>
          <h2 id={titleId} className={styles.title}>
            {t("qualityScore.title")}
          </h2>
          <p className={styles.subtitle}>{t("qualityScore.subtitle")}</p>
        </div>
        <ScoreGauge score={finalScore} grade={grade.letter} tone={grade.tone} animate={animate} />
        <p className={styles.verdict}>
          <span className={styles.verdictGrade}>
            {tx(t, "qualityScore.gradeLabel", "Grade")} {grade.letter}
          </span>
          <span className={styles.verdictText}>{grade.verdict}</span>
        </p>

        {hasActions ? (
          <div className={styles.actions} data-reveal>
            <div className={styles.ctaRow}>
              {onPreviewAutoFix ? (
                <button type="button" className={`${styles.ctaPrimary} focusRing`} onClick={onPreviewAutoFix}>
                  {tx(t, "qualityScore.ctaAutoFix", "Preview auto-fix")}
                  <MaterialIcon name="arrow_forward" size="sm" />
                </button>
              ) : null}
              <button type="button" className={`${styles.ctaSecondary} focusRing`} onClick={copyReport}>
                {tx(t, "qualityScore.report.copy", "Copy report")}
              </button>
              {onContinueWorkspace ? (
                <button type="button" className={`${styles.ctaSecondary} focusRing`} onClick={onContinueWorkspace}>
                  {t("qualityScore.ctaWorkspace")}
                </button>
              ) : null}
            </div>
            <div className={styles.textRow}>
              {onViewFullAnalysis ? (
                <button type="button" className={`${styles.ctaText} focusRing`} onClick={onViewFullAnalysis}>
                  {t("qualityScore.ctaAnalysis")}
                </button>
              ) : null}
              {onRoastApi ? (
                <button type="button" className={`${styles.ctaText} ${styles.ctaRoast} focusRing`} onClick={onRoastApi}>
                  <span className={styles.emoji} aria-hidden>
                    🔥
                  </span>
                  {tx(t, "qualityScore.roastCta", "Roast this API")}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.details}>
        <section className={styles.section}>
          <h3 className={styles.label}>{t("qualityScore.breakdownTitle")}</h3>
          <ul className={styles.pillars}>
            {BREAKDOWN_KEYS.map(({ key, labelKey }) => {
              const earned = breakdown[key];
              const max = SCORE_CATEGORY_MAX[key];
              const ratio = max > 0 ? Math.min(1, earned / max) : 0;
              return (
                <li
                  key={key}
                  className={styles.row}
                  style={{ ["--pillar-tone" as string]: pillarTone(ratio) } as CSSProperties}
                >
                  <span className={styles.rowLabel}>{t(labelKey)}</span>
                  <span className={styles.track} aria-hidden>
                    <span className={styles.fill} data-fill={ratio} style={{ transform: `scaleX(${ratio})` }} />
                  </span>
                  <span className={styles.rowNums}>
                    <span data-pts={earned}>{earned}</span>
                    <span className={styles.rowMax}>/{max}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {previewIssues.length > 0 ? (
          <section className={styles.section}>
            <h3 className={styles.label}>{t("qualityScore.topIssues")}</h3>
            <ul className={styles.issues}>
              {previewIssues.map((issue, i) => {
                const { route, text } = splitRoute(issue.message);
                return (
                  <li key={`${issue.message}-${i}`} className={styles.issueItem} data-reveal>
                    <span className={`${styles.sevChip} ${sevClass(issue.severity)}`}>
                      {tx(t, `qualityScore.analysis.sev.${issue.severity}`, issue.severity)}
                    </span>
                    <span className={styles.issueBody}>
                      {route ? <code className={styles.route}>{route}</code> : null}
                      <span className={styles.issueMsg}>{text}</span>
                      <span className={styles.issueFix}>{issue.example_fix}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
