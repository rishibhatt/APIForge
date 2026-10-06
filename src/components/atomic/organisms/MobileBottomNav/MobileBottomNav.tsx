"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import MethodBadge from "@/components/atomic/atoms/MethodBadge/MethodBadge";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./MobileBottomNav.module.css";

interface MobileBottomNavProps {
  t: TranslateFn;
  hasWorkspace: boolean;
}

/**
 * Phone-only bar. The wide left button is the endpoint switcher: it names the current
 * endpoint and opens the explorer drawer. The right button jumps to the code panel.
 */
export default function MobileBottomNav({ t }: MobileBottomNavProps) {
  const setMobileSidebarOpen = useWorkspaceStore((s) => s.setMobileSidebarOpen);
  const mobileOpen = useWorkspaceStore((s) => s.mobileSidebarOpen);
  const activeEndpoint = useWorkspaceStore((s) => s.activeEndpoint);

  return (
    <nav className={styles.nav} aria-label={t("mobileNav.aria")}>
      <button
        type="button"
        className={`${styles.switcher} focusRing`}
        aria-controls="workspace-explorer"
        aria-expanded={mobileOpen}
        aria-label={
          activeEndpoint
            ? `${t("mobileNav.explorer")}: ${activeEndpoint.method.toUpperCase()} ${activeEndpoint.path}`
            : t("mobileNav.explorer")
        }
        onClick={() => setMobileSidebarOpen(!mobileOpen)}
      >
        {activeEndpoint ? (
          <>
            <MethodBadge method={activeEndpoint.method} />
            <span className={styles.path}>{activeEndpoint.path}</span>
          </>
        ) : (
          <>
            <MaterialIcon name="menu" size="md" />
            <span className={styles.path}>{t("mobileNav.explorer")}</span>
          </>
        )}
        <MaterialIcon
          name={mobileOpen ? "expand_more" : "expand_less"}
          size="md"
          className={styles.caret}
        />
      </button>
      <button
        type="button"
        className={`${styles.btn} focusRing`}
        onClick={() => {
          setMobileSidebarOpen(false);
          document
            .getElementById("workspace-code")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        <MaterialIcon name="code" size="md" />
        <span className={styles.btnLabel}>{t("mobileNav.code")}</span>
      </button>
    </nav>
  );
}
