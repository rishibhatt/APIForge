"use client";

import Link from "next/link";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./RoastVerdict.module.css";

export interface RoastVerdictProps {
  score: number;
  onReset: () => void;
  onOpenWorkspace?: () => void;
}

export default function RoastVerdict({
  score,
  onReset,
  onOpenWorkspace,
}: RoastVerdictProps) {
  const potentialScore = Math.min(98, Math.max(score + 35, 82));

  return (
    <section className={styles.container}>
      <div className={styles.kicker}>THERE IS HOPE.</div>
      <h3 className={styles.title}>YOUR API CAN BE FIXED</h3>

      <div className={styles.scoreFixRow}>
        <span className={styles.currentScore}>{score}</span>
        <MaterialIcon name="arrow_forward" size="sm" className={styles.arrow} />
        <span className={styles.potentialScore}>{potentialScore}</span>
        <span className={styles.fixLabel}>with APIForge Auto-Fix</span>
      </div>

      <div className={styles.buttonRow}>
        {onOpenWorkspace ? (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onOpenWorkspace}
          >
            <MaterialIcon name="build" size="sm" />
            <span>OPEN IN APIFORGE WORKSPACE</span>
          </button>
        ) : (
          <Link href="/" className={styles.primaryBtn}>
            <MaterialIcon name="build" size="sm" />
            <span>OPEN IN APIFORGE WORKSPACE</span>
          </Link>
        )}

        <button type="button" className={styles.secondaryBtn} onClick={onReset}>
          <MaterialIcon name="refresh" size="sm" />
          <span>ROAST ANOTHER API</span>
        </button>
      </div>

      <div className={styles.brandFooter}>
        Powered by APIForge • API quality analysis based on documented OpenAPI rules.
      </div>
    </section>
  );
}
