"use client";

import { useEffect, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import Link from "next/link";
import AppLogo from "@/components/atomic/atoms/AppLogo/AppLogo";
import btn from "@/components/atomic/atoms/Button/Button.module.css";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import ThemeToggle from "@/components/atomic/molecules/ThemeToggle/ThemeToggle";
import { toast } from "@/components/providers/Toaster/toast";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./WorkspaceHeader.module.css";

export interface WorkspaceHeaderProps {
  t: TranslateFn;
  hasWorkspace: boolean;
  isParsing?: boolean;
  parseError?: string | null;
  onParse?: () => void;
}

export default function WorkspaceHeader({
  t,
  hasWorkspace,
  isParsing = false,
  onParse,
}: WorkspaceHeaderProps) {
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);
  const setMobileSidebarOpen = useWorkspaceStore((s) => s.setMobileSidebarOpen);
  const focusMode = useWorkspaceStore((s) => s.focusMode);
  const toggleFocusMode = useWorkspaceStore((s) => s.toggleFocusMode);
  const specTitle = useWorkspaceStore((s) => s.specTitle);
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const progress = useWorkspaceStore((s) => s.parseProgress);
  const setParseProgress = useWorkspaceStore((s) => s.setParseProgress);
  const [showDone, setShowDone] = useState(false);

  // "Loaded N endpoints" confirmation after a re-parse, then it gets out of the way.
  useEffect(() => {
    if (progress.phase !== "done") {
      setShowDone(false);
      return;
    }
    setShowDone(true);
    const id = window.setTimeout(() => setShowDone(false), 3200);
    return () => window.clearTimeout(id);
  }, [progress.phase, progress.endpointCount]);

  const loading = isParsing || progress.phase === "fetching" || progress.phase === "parsing";
  const errorInfo = progress.phase === "error" ? progress.error : null;
  const dismissError = () => setParseProgress({ phase: "idle", error: null });

  // The panel below keeps the retry actions; the toast makes sure the failure is noticed.
  useEffect(() => {
    if (!errorInfo) return;
    toast.error(errorInfo.title, { description: errorInfo.fix, id: "parse-error" });
  }, [errorInfo]);

  const statusPop = loading ? (
    <div className={styles.statusPop} role="status" aria-live="polite">
      <MaterialIcon name="progress_activity" size="xs" className={btn.spin} />
      <span>
        {progress.phase === "parsing" ? t("header.progressParsing") : t("header.progressFetching")}
      </span>
    </div>
  ) : errorInfo ? (
    <div className={`${styles.statusPop} ${styles.statusError}`} role="alert">
      <div className={styles.errorHead}>
        <MaterialIcon name="error" size="sm" className={styles.errorIcon} />
        <p className={styles.errorTitle}>{errorInfo.title}</p>
      </div>
      <p className={styles.errorFix}>{errorInfo.fix}</p>
      {errorInfo.raw && errorInfo.raw !== errorInfo.title ? (
        <p className={styles.errorRaw}>{errorInfo.raw}</p>
      ) : null}
      <div className={styles.errorActions}>
        <button
          type="button"
          className={`${btn.btn} ${btn.secondary} ${btn.sm} focusRing`}
          onClick={onParse}
        >
          {t("header.errorTryAgain")}
        </button>
        <button
          type="button"
          className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing`}
          onClick={dismissError}
        >
          {t("header.errorDismiss")}
        </button>
      </div>
    </div>
  ) : showDone && progress.endpointCount != null ? (
    <div className={`${styles.statusPop} ${styles.statusDone}`} role="status" aria-live="polite">
      <MaterialIcon name="check_circle" size="xs" />
      <span>{t("header.progressDone", { count: progress.endpointCount })}</span>
    </div>
  ) : null;

  return (
    <header className={styles.header}>
      {loading ? <span className={styles.progressBar} aria-hidden /> : null}
      <div className={styles.left}>
        <button
          type="button"
          className={`${styles.menuBtn} focusRing`}
          aria-label={t("a11y.openExplorer")}
          aria-controls="workspace-explorer"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <MaterialIcon name="menu" size="md" />
        </button>
        {hasWorkspace ? (
          <Link
            href="/"
            className={`${styles.exitLink} focusRing`}
            onClick={() => {
              setMobileSidebarOpen(false);
              clearWorkspace();
            }}
            title={t("header.exitWorkspace")}
            aria-label={t("header.exitWorkspace")}
          >
            <MaterialIcon name="arrow_back" size="xs" />
            <span className={styles.exitText}>{t("header.exit")}</span>
          </Link>
        ) : null}
        <Link
          href="/"
          className={`${styles.brandWrap} focusRing`}
          aria-label={t("common.appName")}
          onClick={() => {
            if (hasWorkspace) clearWorkspace();
          }}
        >
          <AppLogo size={26} maxWidth={26} className={styles.brandLogo} priority />
          <span className={styles.brand}>{t("common.appName")}</span>
        </Link>
      </div>

      <div className={styles.center}>
        {hasWorkspace ? (
          <div className={styles.specBadge} title={specTitle || "Active API Specification"}>
            <MaterialIcon name="api" size="xs" className={styles.specIcon} />
            <span className={styles.specTitleText}>{specTitle || "API Workspace"}</span>
            <span className={styles.specCountPill}>
              {endpoints.length} {endpoints.length === 1 ? "endpoint" : "endpoints"}
            </span>
          </div>
        ) : null}
        {statusPop}
      </div>

      <div className={styles.right}>
        {hasWorkspace ? (
          <button
            type="button"
            className={`${styles.focusBtn} focusRing`}
            onClick={() => {
              setMobileSidebarOpen(false);
              toggleFocusMode();
            }}
            title={focusMode ? t("header.exitFocusMode") : t("header.enterFocusMode")}
            aria-pressed={focusMode}
            aria-label={focusMode ? t("header.exitFocusMode") : t("header.enterFocusMode")}
          >
            <MaterialIcon name={focusMode ? "close_fullscreen" : "open_in_full"} size="md" />
          </button>
        ) : null}
        <ThemeToggle t={t} variant="icon" />
        {hasWorkspace ? (
          <button
            type="button"
            className={`${btn.btn} ${btn.secondary} ${btn.sm} ${styles.clearBtn} focusRing`}
            onClick={() => clearWorkspace()}
            title="Clear workspace to parse another API"
          >
            <MaterialIcon name="close" size="xs" />
            <span>{t("header.clearWorkspace")}</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
