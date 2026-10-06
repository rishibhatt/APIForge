import Link from "next/link";
import styles from "./RoastFinalCTA.module.css";

export interface RoastFinalCTAProps {
  /** Opens the support modal. Omit where the modal isn't mounted. */
  onSupport?: () => void;
}

export default function RoastFinalCTA({ onSupport }: RoastFinalCTAProps) {
  return (
    <aside className={styles.wrap} data-reveal>
      <p className={styles.text}>
        The roast uses the same rule engine as the APIForge workspace, where you can run requests,
        validate responses and generate TypeScript types from the same spec.{" "}
        <Link href="/" className={styles.link}>
          Open the workspace
        </Link>
      </p>
      {onSupport ? (
        <p className={styles.text}>
          APIForge is free and open source.{" "}
          <button type="button" className={styles.link} onClick={onSupport}>
            Support the project
          </button>
        </p>
      ) : null}
    </aside>
  );
}
