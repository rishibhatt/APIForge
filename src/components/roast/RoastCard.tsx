import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./RoastCard.module.css";

export interface RoastCardProps {
  roastText: string;
  characterCount: number;
  variantNumber?: number;
  onRoastAgain?: () => void;
  onOpenShare?: () => void;
}

export default function RoastCard({
  roastText,
  characterCount,
  variantNumber = 1,
  onRoastAgain,
}: RoastCardProps) {
  return (
    <section className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.badge}>
          <MaterialIcon name="local_fire_department" size="sm" />
          <span>ROAST #{variantNumber}</span>
        </div>
        <span className={styles.byline}>— APIForge</span>
      </div>

      <div className={styles.roastBody}>&quot;{roastText}&quot;</div>

      <div className={styles.footer}>
        <span className={styles.charCount}>{characterCount} characters</span>

        {onRoastAgain ? (
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtn} onClick={onRoastAgain}>
              <MaterialIcon name="autorenew" size="sm" />
              <span>ROAST AGAIN</span>
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
