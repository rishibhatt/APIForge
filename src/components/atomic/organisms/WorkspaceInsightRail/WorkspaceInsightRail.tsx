"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./WorkspaceInsightRail.module.css";

export interface WorkspaceInsightRailProps {
  t: TranslateFn;
}

export default function WorkspaceInsightRail({ t }: WorkspaceInsightRailProps) {
  return (
    <aside
      className={styles.rail}
      aria-label={t("workspace.insightRailAria")}
    >
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {t("workspace.collectionIntelligence")}
        </h3>
        <div className={styles.aiCard}>
          <div className={styles.aiCardHead}>
            <div className={styles.aiIconPrimary}>
              <MaterialIcon name="auto_awesome" size="md" />
            </div>
            <div>
              <h4 className={styles.aiTitle}>{t("workspace.bulkDocTitle")}</h4>
              <p className={styles.aiSub}>{t("workspace.bulkDocSub")}</p>
            </div>
          </div>
          <p className={styles.aiBody}>{t("workspace.bulkDocBody")}</p>
          <button type="button" className={styles.aiCta}>
            {t("workspace.bulkDocCta")}
          </button>
        </div>

        <div className={styles.toolCard}>
          <div className={styles.aiCardHead}>
            <div className={styles.aiIconTertiary}>
              <MaterialIcon name="code" size="md" />
            </div>
            <div>
              <h4 className={styles.aiTitle}>{t("workspace.testPromptTitle")}</h4>
              <p className={styles.aiSub}>{t("workspace.testPromptSub")}</p>
            </div>
          </div>
          <button type="button" className={styles.toolBtn}>
            {t("workspace.testPromptCta")}
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("workspace.exportSync")}</h3>
        <div className={styles.exportGrid}>
          <button type="button" className={styles.exportTile}>
            <MaterialIcon name="download" size="md" />
            <span>{t("workspace.exportPostman")}</span>
          </button>
          <button type="button" className={styles.exportTile}>
            <MaterialIcon name="cloud_sync" size="md" />
            <span>{t("workspace.exportSwagger")}</span>
          </button>
        </div>
      </div>

      <div className={styles.health}>
        <span className={styles.healthLabel}>{t("workspace.networkHealth")}</span>
        <div className={styles.healthValue}>99.98%</div>
        <div className={styles.healthBars} aria-hidden>
          <span className={styles.bar} />
          <span className={styles.bar} />
          <span className={styles.bar} />
          <span className={styles.bar} />
          <span className={styles.bar} />
          <span className={styles.bar} />
          <span className={styles.bar} />
        </div>
        <div className={styles.healthGlow} aria-hidden />
      </div>
    </aside>
  );
}
