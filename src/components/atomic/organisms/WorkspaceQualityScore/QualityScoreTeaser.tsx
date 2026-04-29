"use client";

import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { TranslateFn } from "@/context/LanguageContext";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./QualityScoreTeaser.module.css";

export default function QualityScoreTeaser({ t }: { t: TranslateFn }) {
  const setOpen = useWorkspaceStore((s) => s.setQualityScoreModalOpen);

  return (
    <button
      type="button"
      className={`${styles.teaser} focusRing`}
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
      aria-expanded={false}
    >
      <span className={styles.shimmer} aria-hidden />
      <span className={styles.iconCluster} aria-hidden>
        <MaterialIcon name="analytics" size="md" />
      </span>
      <span className={styles.copy}>
        <span className={styles.kicker}>{t("qualityScore.teaser.kicker")}</span>
        <span className={styles.headline}>{t("qualityScore.teaser.headline")}</span>
        <span className={styles.sub}>{t("qualityScore.teaser.sub")}</span>
      </span>
      <span className={styles.cta}>
        <span className={styles.ctaText}>{t("qualityScore.teaser.cta")}</span>
        <MaterialIcon name="chevron_right" size="sm" aria-hidden />
      </span>
    </button>
  );
}
