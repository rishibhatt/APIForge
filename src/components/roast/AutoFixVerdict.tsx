import Link from "next/link";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import shared from "./RoastSection.module.css";
import styles from "./AutoFixVerdict.module.css";

export interface AutoFixVerdictProps {
  score: number;
  onReset?: () => void;
  onOpenWorkspace?: () => void;
}

export default function AutoFixVerdict({ score, onReset, onOpenWorkspace }: AutoFixVerdictProps) {
  const projected = Math.max(score, Math.min(98, Math.max(score + 35, 82)));
  const gain = projected - score;

  const lede =
    score >= 85
      ? "Already in decent shape. Auto-fix mops up what's left."
      : score >= 55
        ? "Your API isn't doomed. It needs some adult supervision and a few rule-based fixes."
        : "It's bad, but it's fixable. Most of these findings have a mechanical fix.";

  return (
    <section id="autofix" className={`${shared.section} ${styles.root}`} aria-labelledby="autofix-title">
      <div className={shared.head} data-reveal>
        <h2 id="autofix-title" className={shared.title}>
          Auto-fix verdict
        </h2>
        <p className={shared.lede}>{lede}</p>
      </div>

      <div className={styles.panel} data-reveal>
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.label}>Today</span>
            <div className={shared.meter} aria-hidden>
              <div className={`${shared.meterFill} ${styles.nowFill}`} data-grow={score / 100} style={{ transform: `scaleX(${score / 100})` }} />
            </div>
            <span className={styles.value}>{score}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>After auto-fix</span>
            <div className={shared.meter} aria-hidden>
              <div className={`${shared.meterFill} ${shared.accent}`} data-grow={projected / 100} style={{ transform: `scaleX(${projected / 100})` }} />
            </div>
            <span className={styles.value}>
              {projected}
              {gain > 0 ? <span className={styles.gain}>+{gain}</span> : null}
            </span>
          </div>
        </div>
        <p className={styles.note}>
          Projected score, an estimate. The auto-fix page previews each change before you apply anything.
        </p>

        <div className={styles.actions}>
          {onOpenWorkspace ? (
            <button type="button" className={shared.btn} onClick={onOpenWorkspace}>
              Preview the fixes
              <MaterialIcon name="arrow_forward" size="xs" />
            </button>
          ) : (
            <Link href="/roast-my-api" className={shared.btn}>
              Roast your own API
              <MaterialIcon name="arrow_forward" size="xs" />
            </Link>
          )}
          {onReset ? (
            <button type="button" className={shared.btnSecondary} onClick={onReset}>
              Roast another API
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
