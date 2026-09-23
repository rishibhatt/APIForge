"use client";

import React from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { TranslateFn } from "@/context/LanguageContext";
import styles from "./FloatingSupportButton.module.css";

interface FloatingSupportButtonProps {
  t: TranslateFn;
}

export default function FloatingSupportButton({ t }: FloatingSupportButtonProps) {
  const toggleSupportModal = useWorkspaceStore((s) => s.toggleSupportModal);

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={toggleSupportModal}
        aria-label="Support APIForge"
      >
        <span className={styles.glowAura} aria-hidden />
        <span className={styles.iconContainer}>
          <span className={styles.coffeeIcon}>☕</span>
          <span className={styles.heartPing} />
        </span>
        <span className={styles.label}>
          <span className={styles.mainText}>{t("support.floatingCta")}</span>
          <span className={styles.subText}>{t("support.floatingBadge")}</span>
        </span>
      </button>
    </div>
  );
}
