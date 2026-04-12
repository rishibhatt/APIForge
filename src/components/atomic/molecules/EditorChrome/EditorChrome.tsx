import styles from "./EditorChrome.module.css";

interface EditorChromeProps {
  fileLabel: string;
  fileMeta: string;
}

export default function EditorChrome({ fileLabel, fileMeta }: EditorChromeProps) {
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
      <span className={styles.fileMeta}>{fileMeta}</span>
    </div>
  );
}
