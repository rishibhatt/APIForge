"use client";

import { useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className={styles.container}>
      <button
        type="button"
        className={styles.headerToggle}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className={styles.headerLeft}>
          <MaterialIcon name="code" className={styles.codeIcon} />
          <div>
            <h3 className={styles.title}>UNDER THE HOOD</h3>
            <p className={styles.subTitle}>For the people who actually want to know what happened.</p>
          </div>
        </div>

        <MaterialIcon
          name={isOpen ? "expand_less" : "expand_more"}
          className={styles.toggleIcon}
        />
      </button>

      {isOpen ? (
        <div className={styles.contentBody}>
          {/* Category Scores Grid */}
          <h4 className={styles.sectionHeading}>Category Score Breakdown</h4>
          <div className={styles.breakdownGrid}>
            {Object.entries(breakdown).map(([category, score]) => (
              <div key={category} className={styles.breakdownCard}>
                <span className={styles.catLabel}>{category.toUpperCase()}</span>
                <span className={styles.catScore}>{score} pts</span>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 ? (
            <>
              <h4 className={styles.sectionHeading}>Deterministic Recommendations</h4>
              <div className={styles.issueList}>
                {suggestions.map((sug, i) => (
                  <div key={i} className={styles.issueItem}>
                    <MaterialIcon name="check_circle" className={styles.checkIcon} size="sm" />
                    <span className={styles.issueMsg}>{sug}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {/* Detailed Evidence Table */}
          <h4 className={styles.sectionHeading}>Aggregated Rule Evidence</h4>
          <div className={styles.issueList}>
            {summary.topPatterns.map((pat) => (
              <div key={pat.ruleId} className={styles.issueItem}>
                <div className={styles.issueHeaderRow}>
                  <span className={styles.ruleBadge}>Rule: {pat.ruleId}</span>
                  <span className={styles.countTag}>{pat.count} occurrences</span>
                </div>
                <span className={styles.issueMsg}>
                  <strong>[{pat.category.toUpperCase()}]</strong> {pat.technicalExplanation}
                </span>
                {pat.representativeEndpoints.length > 0 ? (
                  <span className={styles.issueFix}>
                    Sample Endpoints: {pat.representativeEndpoints.join(", ")}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
