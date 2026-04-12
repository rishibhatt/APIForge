"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./WorkspaceFooter.module.css";

interface WorkspaceFooterProps {
  t: TranslateFn;
}

export default function WorkspaceFooter({ t }: WorkspaceFooterProps) {
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const parseError = useWorkspaceStore((s) => s.parseError);
  const lastMs = useWorkspaceStore((s) => s.lastGenerationMs);

  const errCount = parseError ? 1 : 0;
  const n = endpoints.length;

  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <div className={styles.statusRow}>
          <div className={styles.pulse} aria-hidden />
          <span className={styles.statusText}>{t("footer.status")}</span>
        </div>
        <div className={styles.statsGroup}>
          <span className={styles.stat}>{t("footer.parsed", { endpoints: n })}</span>
          <span className={styles.stat}>{t("footer.errors", { errors: errCount })}</span>
          <span className={styles.stat}>{t("footer.nodes", { nodes: n })}</span>
        </div>
      </div>
      <div className={styles.right}>
        {lastMs != null ? (
          <span className={styles.genTime}>
            {t("footer.generationTime", { ms: lastMs })}
          </span>
        ) : (
          <span className={styles.genTime}>{t("footer.generationIdle")}</span>
        )}
        <div className={styles.iconGroup}>
          <button
            type="button"
            className={`${styles.iconBtn} focusRing`}
            aria-label={t("a11y.wifi")}
          >
            <MaterialIcon name="wifi" size="sm" />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} focusRing`}
            aria-label={t("a11y.terminal")}
          >
            <MaterialIcon name="terminal" size="sm" />
          </button>
        </div>
      </div>
    </footer>
  );
}
