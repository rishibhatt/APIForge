"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./WorkspaceFooter.module.css";

interface WorkspaceFooterProps {
  t: TranslateFn;
  hasWorkspace: boolean;
}

export default function WorkspaceFooter({ t, hasWorkspace }: WorkspaceFooterProps) {
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const parseError = useWorkspaceStore((s) => s.parseError);
  const lastMs = useWorkspaceStore((s) => s.lastGenerationMs);

  const errCount = parseError ? 1 : 0;
  const n = endpoints.length;

  return (
    <footer
      className={`${styles.footer} ${hasWorkspace ? styles.footerWorkspace : ""}`}
    >
      <div className={styles.left}>
        <div className={styles.statusRow}>
          <div className={styles.pulse} aria-hidden />
          <span className={styles.statusText}>{t("footer.status")}</span>
        </div>
        <div className={styles.statsGroup}>
          <span className={styles.stat}>{t("footer.parsed", { endpoints: n })}</span>
          <span className={styles.stat}>{t("footer.errors", { errors: errCount })}</span>
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
      </div>
    </footer>
  );
}
