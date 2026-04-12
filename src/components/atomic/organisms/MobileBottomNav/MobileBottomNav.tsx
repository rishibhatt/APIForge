"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./MobileBottomNav.module.css";

interface MobileBottomNavProps {
  t: TranslateFn;
  hasWorkspace: boolean;
}

export default function MobileBottomNav({
  t,
  hasWorkspace,
}: MobileBottomNavProps) {
  const setMobileSidebarOpen = useWorkspaceStore((s) => s.setMobileSidebarOpen);

  return (
    <nav className={styles.nav} aria-label={t("mobileNav.aria")}>
      <button
        type="button"
        className={`${styles.btn} ${hasWorkspace ? styles.btnActive : ""} focusRing`}
        onClick={() => setMobileSidebarOpen(true)}
      >
        <MaterialIcon name="explore" size="sm" />
        {t("mobileNav.explorer")}
      </button>
      <button
        type="button"
        className={`${styles.btn} focusRing`}
        onClick={() => {
          document
            .getElementById("workspace-code")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        <MaterialIcon name="code" size="sm" />
        {t("mobileNav.code")}
      </button>
    </nav>
  );
}
