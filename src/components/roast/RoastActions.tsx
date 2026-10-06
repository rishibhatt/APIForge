"use client";

import FireIcon from "@/components/atomic/atoms/FireIcon/FireIcon";

import Link from "next/link";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { SanitizedRoastReport } from "@/lib/roast/types";
import ShareComposer from "./ShareComposer";
import styles from "./RoastActions.module.css";

export interface RoastActionsProps {
  report: SanitizedRoastReport;
  isPublic?: boolean;
  isRoasting?: boolean;
  onRoastAgain?: () => void;
  onReset?: () => void;
}

/** Share-first block directly under the poster: the composer, then the next-step buttons. */
export default function RoastActions({ report, isRoasting, isPublic, onRoastAgain, onReset }: RoastActionsProps) {
  return (
    <div className={styles.bar}>
      <ShareComposer report={report} />

      <div className={styles.next}>
        {!isPublic && onRoastAgain ? (
          <button type="button" className={styles.ghost} onClick={onRoastAgain} disabled={isRoasting} aria-busy={isRoasting}>
            <MaterialIcon name="autorenew" size="sm" className={isRoasting ? styles.spin : undefined} />
            <span>{isRoasting ? "Rewriting…" : "Roast it again"}</span>
          </button>
        ) : null}
        {onReset ? (
          <button type="button" className={styles.heat} onClick={onReset}>
            <FireIcon size={22} />
            <span>Roast another API</span>
          </button>
        ) : (
          <Link href="/roast-my-api" className={styles.heat}>
            <FireIcon size={22} />
            <span>Roast your API</span>
          </Link>
        )}
      </div>
    </div>
  );
}
