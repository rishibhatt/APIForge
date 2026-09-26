"use client";

import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { RoastStrength } from "@/lib/roast/types";
import styles from "./RoastStrengths.module.css";

export interface RoastStrengthsProps {
  strengths: RoastStrength[];
  totalFindings?: number;
}

export default function RoastStrengths({ strengths, totalFindings = 0 }: RoastStrengthsProps) {
  const problemsCount = Math.max(0, totalFindings);
  const strengthsCount = strengths.length;
  const totalItems = problemsCount + strengthsCount || 1;
  const healthRatio = Math.round((strengthsCount / totalItems) * 100);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerTitleRow}>
          <MaterialIcon name="check_circle" className={styles.checkIcon} />
          <h3 className={styles.sectionTitle}>YOU&apos;RE NOT COMPLETELY COOKED</h3>
        </div>
        <p className={styles.sectionSub}>&quot;Some things actually survived the audit.&quot;</p>
      </div>

      {/* Recovery Ratio Bar */}
      <div className={styles.recoveryCard}>
        <div className={styles.recoveryHeader}>
          <span className={styles.recoveryLabel}>FOUNDATION RATIO</span>
          <span className={styles.recoveryStats}>
            {strengthsCount} Strengths • {problemsCount} Issues
          </span>
        </div>

        <div className={styles.ratioBarTrack}>
          <div
            className={styles.ratioBarProblems}
            style={{ width: `${100 - healthRatio}%` }}
            title={`${problemsCount} Issues`}
          />
          <div
            className={styles.ratioBarStrengths}
            style={{ width: `${healthRatio}%` }}
            title={`${strengthsCount} Strengths`}
          />
        </div>
      </div>

      {strengths.length > 0 ? (
        <div className={styles.grid}>
          {strengths.map((s, idx) => (
            <div key={idx} className={styles.card}>
              <div className={styles.cardIconWrap}>
                <MaterialIcon name="verified" className={styles.badgeIcon} />
              </div>
              <div className={styles.cardContent}>
                <h4 className={styles.title}>✓ {s.title}</h4>
                <p className={styles.desc}>{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyCard}>
          <MaterialIcon name="sentiment_dissatisfied" className={styles.emptyIcon} />
          <p className={styles.emptyText}>Nothing escaped the audit. Let&apos;s work on that in the Auto-Fix workspace.</p>
        </div>
      )}
    </section>
  );
}
