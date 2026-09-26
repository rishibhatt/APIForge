"use client";

import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./RoastFinalCTA.module.css";

export interface RoastFinalCTAProps {
  onReset: () => void;
  onOpenWorkspace?: () => void;
}

export default function RoastFinalCTA({ onReset, onOpenWorkspace }: RoastFinalCTAProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>SO... ARE YOU FIXING THIS</h2>
      <div className={styles.subHeading}>OR ARE WE KEEPING THE RECEIPTS?</div>

      <div className={styles.buttonGroup}>
        {onOpenWorkspace ? (
          <button type="button" onClick={onOpenWorkspace} className={styles.primaryBtn}>
            <MaterialIcon name="build" size="sm" />
            <span>FIX THE DAMAGE</span>
          </button>
        ) : (
          <a href="/" className={styles.primaryBtn}>
            <MaterialIcon name="build" size="sm" />
            <span>FIX THE DAMAGE</span>
          </a>
        )}

        <button type="button" onClick={onReset} className={styles.secondaryBtn}>
          <MaterialIcon name="refresh" size="sm" />
          <span>ROAST ANOTHER API</span>
        </button>
      </div>

      <div className={styles.footerText}>
        Build APIs worth bragging about with APIForge.
      </div>
    </section>
  );
}
