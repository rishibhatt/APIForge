import type { ReactNode } from "react";
import styles from "./EditorChrome.module.css";

interface EditorChromeProps {
  fileLabel: string;
  fileMeta: string;
  /** Toolbar actions (e.g. copy / regenerate) shown on the right of the chrome row. */
  actions?: ReactNode;
}

export default function EditorChrome({
  fileLabel,
  fileMeta,
  actions,
}: EditorChromeProps) {
  return (
    <div className={styles.row}>
      <div className={styles.left}>
        <div className={styles.dots} aria-hidden>
          <span className={styles.dotR} />
          <span className={styles.dotA} />
          <span className={styles.dotG} />
        </div>
        <span className={styles.fileLabel}>{fileLabel}</span>
      </div>
      <div className={styles.right}>
        <span className={styles.fileMeta}>{fileMeta}</span>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </div>
  );
}
