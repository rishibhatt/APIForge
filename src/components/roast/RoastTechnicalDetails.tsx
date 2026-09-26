"use client";

import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { RoastSummary } from "@/lib/roast/types";
import styles from "./RoastTechnicalDetails.module.css";

export interface RoastTechnicalDetailsProps {
  summary: RoastSummary;
  breakdown: Record<string, number>;
  suggestions?: string[];
}

export default function RoastTechnicalDetails({
  summary,
  breakdown,
  suggestions = [],
}: RoastTechnicalDetailsProps) {
  return (
    <section className={styles.container}>
      <h3 className={styles.title}>
        <MaterialIcon name="analytics" />
        <span>Full API Quality Technical Breakdown</span>
      </h3>

      <div className={styles.breakdownGrid}>
        {Object.entries(breakdown).map(([category, score]) => (
          <div key={category} className={styles.breakdownCard}>
            <span className={styles.catLabel}>{category}</span>
            <span className={styles.catScore}>{score} pts</span>
          </div>
        ))}
      </div>

      {suggestions.length > 0 ? (
        <>
          <h4 className={styles.subTitle}>Deterministic Recommendations</h4>
          <div className={styles.issueList}>
            {suggestions.map((sug, i) => (
              <div key={i} className={styles.issueItem}>
                <span className={styles.issueMsg}>✓ {sug}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <h4 className={styles.subTitle}>Aggregated Pattern Evidence</h4>
      <div className={styles.issueList}>
        {summary.topPatterns.map((pat) => (
          <div key={pat.ruleId} className={styles.issueItem}>
            <span className={styles.issueMsg}>
              <strong>[{pat.category.toUpperCase()}]</strong> {pat.technicalExplanation} ({pat.count} occurrences)
            </span>
            {pat.representativeEndpoints.length > 0 ? (
              <span className={styles.issueFix}>
                Sample: {pat.representativeEndpoints.join(", ")}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
