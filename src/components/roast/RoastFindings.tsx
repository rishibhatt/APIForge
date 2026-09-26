"use client";

import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { RoastPattern } from "@/lib/roast/types";
import styles from "./RoastFindings.module.css";

export interface RoastFindingsProps {
  patterns: RoastPattern[];
}

export default function RoastFindings({ patterns }: RoastFindingsProps) {
  if (patterns.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <MaterialIcon name="warning" />
          <span>THE BIGGEST CRIMES</span>
        </h3>
        <span className={styles.sectionSub}>Top aggregated architectural offences</span>
      </div>

      <div className={styles.grid}>
        {patterns.slice(0, 5).map((pattern, idx) => (
          <article key={pattern.ruleId} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.number}>
                CRIME #{String(idx + 1).padStart(2, "0")}
              </span>
              <span className={styles.badge}>{pattern.category.toUpperCase()}</span>
            </div>

            <h4 className={styles.title}>
              {pattern.count} {pattern.count === 1 ? "issue" : "issues"} detected ({pattern.percentage}% of endpoints)
            </h4>

            <p className={styles.desc}>{pattern.technicalExplanation}</p>

            {pattern.representativeEndpoints.length > 0 ? (
              <div className={styles.endpoints}>
                {pattern.representativeEndpoints.map((ep) => (
                  <div key={ep} className={styles.endpointItem}>
                    • {ep}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
