"use client";

import type { SanitizedRoastReport } from "@/lib/roast/types";
import { useRef } from "react";
import { adaptRoastSummaryToPresentation } from "@/lib/roast/presentationAdapter";
import RoastPoster from "./RoastPoster";
import RoastActions from "./RoastActions";
import RoastSubNav from "./RoastSubNav";
import RoastOffences from "./RoastOffences";
import DamageSnapshot from "./DamageSnapshot";
import RoastStrengths from "./RoastStrengths";
import RoastTechnicalDetails from "./RoastTechnicalDetails";
import AutoFixVerdict from "./AutoFixVerdict";
import RoastShare from "./RoastShare";
import RoastFinalCTA from "./RoastFinalCTA";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { CATEGORY_MAX, TIER_LABELS, categoryLabel, tierFromScore, tierTone } from "./labels";
import { useRoastMotion } from "./useRoastMotion";
import { useRoastShare } from "./useRoastShare";
import { XIcon } from "./ShareComposer";
import shared from "./RoastSection.module.css";
import styles from "./RoastReport.module.css";

export interface RoastReportProps {
  report: SanitizedRoastReport;
  /** Shared links render read-only: no re-roast, no workspace hand-off. */
  isPublic?: boolean;
  variantNumber?: number;
  isRoasting?: boolean;
  onRoastAgain?: () => void;
  onReset?: () => void;
  onOpenWorkspace?: () => void;
  onSupport?: () => void;
}

function formatPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Sticky right rail on wide screens: score, facts, and the quick share actions. */
function ReportRail({ report, affectedPercentage }: { report: SanitizedRoastReport; affectedPercentage: number }) {
  const { summary } = report;
  const s = useRoastShare(report);
  const tier = summary.statusTier ?? tierFromScore(summary.score);
  const tone = tierTone(tier);
  const pillars = Object.entries(report.breakdown);

  return (
    <aside className={styles.rail} aria-label="Score summary">
      <section className={styles.card} data-reveal aria-labelledby="rail-score">
        <h2 id="rail-score" className={styles.cardLabel}>
          Score card
        </h2>
        <p className={styles.scoreLine} aria-label={`Score: ${summary.score} out of 100, ${TIER_LABELS[tier]}`}>
          <span className={`${styles.scoreNum} ${styles[`tone_${tone}`]}`} data-countup={summary.score}>
            {summary.score}
          </span>
          <span className={styles.scoreDenom}>/100</span>
          <span className={`${styles.tier} ${styles[`tone_${tone}`]}`}>{TIER_LABELS[tier]}</span>
        </p>

        {pillars.length > 0 ? (
          <ul className={styles.pillars}>
            {pillars.map(([key, points]) => {
              const max = CATEGORY_MAX[key];
              const ratio = max ? Math.min(1, points / max) : 0;
              const fill = ratio >= 0.85 ? shared.ok : ratio >= 0.6 ? shared.warn : shared.bad;
              return (
                <li key={key} className={styles.pillar}>
                  <span className={styles.pillarName}>{categoryLabel(key)}</span>
                  <span className={styles.pillarVal}>
                    {formatPoints(points)}
                    {max ? <span className={styles.pillarMax}>/{max}</span> : null}
                  </span>
                  <div className={`${shared.meter} ${styles.thin}`} aria-hidden>
                    <div
                      className={`${shared.meterFill} ${fill}`}
                      data-grow={ratio}
                      style={{ transform: `scaleX(${ratio})` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className={styles.card} data-reveal aria-labelledby="rail-facts">
        <h2 id="rail-facts" className={styles.cardLabel}>
          Quick facts
        </h2>
        <dl className={styles.facts}>
          <div>
            <dt>Endpoints</dt>
            <dd>{summary.totalEndpoints}</dd>
          </div>
          <div>
            <dt>Findings</dt>
            <dd>{summary.totalFindings}</dd>
          </div>
          <div>
            <dt>Routes hit</dt>
            <dd>{affectedPercentage}%</dd>
          </div>
        </dl>
      </section>

      <section className={`${styles.card} ${styles.quickShare}`} data-reveal aria-labelledby="rail-share">
        <h2 id="rail-share" className={styles.cardLabel}>
          Share
        </h2>
        <div className={styles.quickActions}>
          <button type="button" className={styles.quickPrimary} onClick={() => s.shareX(s.draftFor("roast"))}>
            <XIcon />
            <span>Post on X</span>
          </button>
          <button
            type="button"
            className={styles.quickBtn}
            onClick={() =>
              s.copy(s.reportUrl, { key: "link", title: "Link copied", description: "Anyone with it can open this report." })
            }
          >
            <MaterialIcon name={s.copied === "link" ? "check" : "link"} size="sm" />
            <span>{s.copied === "link" ? "Copied" : "Copy link"}</span>
          </button>
          <button type="button" className={styles.quickBtn} onClick={s.downloadCard}>
            <MaterialIcon name="download" size="sm" />
            <span>Save card</span>
          </button>
        </div>
      </section>
    </aside>
  );
}

export default function RoastReport({
  report,
  isPublic = false,
  variantNumber,
  isRoasting,
  onRoastAgain,
  onReset,
  onOpenWorkspace,
  onSupport,
}: RoastReportProps) {
  const rootRef = useRef<HTMLElement>(null);
  useRoastMotion(rootRef);
  const { summary } = report;
  const presentation = adaptRoastSummaryToPresentation(summary);

  const nav = [
    { id: "offences", label: "Worst offences", show: presentation.offences.length > 0 },
    { id: "categories", label: "Where the issues are", show: presentation.heatmap.length > 0 },
    { id: "strengths", label: "What held up", show: true },
    { id: "details", label: "Technical details", show: true },
    { id: "autofix", label: "Auto-fix verdict", show: true },
    { id: "share", label: "Badge & link", show: true },
  ].filter((n) => n.show);

  return (
    <article ref={rootRef} className={styles.report}>
      <div data-rise>
        <RoastPoster
          report={report}
          affectedPercentage={presentation.metrics.affectedPercentage}
          variantNumber={variantNumber}
        />
      </div>
      <RoastActions
        report={report}
        isPublic={isPublic}
        isRoasting={isRoasting}
        onRoastAgain={isPublic ? undefined : onRoastAgain}
        onReset={onReset}
      />

      <RoastSubNav items={nav.map(({ id, label }) => ({ id, label }))} />

      <div className={styles.layout}>
        <div className={styles.main}>
          <RoastOffences offences={presentation.offences} />
          <div className={styles.pair}>
            <DamageSnapshot heatmap={presentation.heatmap} totalIssues={summary.totalFindings} />
            <RoastStrengths strengths={summary.strengths} />
          </div>
          <RoastTechnicalDetails summary={summary} breakdown={report.breakdown} suggestions={report.suggestions} />
        </div>
        <ReportRail report={report} affectedPercentage={presentation.metrics.affectedPercentage} />
      </div>

      <div className={styles.lower}>
        <AutoFixVerdict
          score={summary.score}
          onReset={isPublic ? undefined : onReset}
          onOpenWorkspace={isPublic ? undefined : onOpenWorkspace}
        />
        <RoastShare report={report} />
      </div>

      <RoastFinalCTA onSupport={onSupport} />
    </article>
  );
}
