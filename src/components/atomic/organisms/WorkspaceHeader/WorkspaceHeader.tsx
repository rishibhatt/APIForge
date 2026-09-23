"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import AppLogo from "@/components/atomic/atoms/AppLogo/AppLogo";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import ThemeToggle from "@/components/atomic/molecules/ThemeToggle/ThemeToggle";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./WorkspaceHeader.module.css";

export interface WorkspaceHeaderProps {
  t: TranslateFn;
  hasWorkspace: boolean;
  isParsing: boolean;
  parseError: string | null;
  onParse: () => void;
}

export default function WorkspaceHeader({
  t,
  hasWorkspace,
  isParsing,
  parseError,
  onParse,
}: WorkspaceHeaderProps) {
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);
  const setMobileSidebarOpen = useWorkspaceStore((s) => s.setMobileSidebarOpen);
  const focusMode = useWorkspaceStore((s) => s.focusMode);
  const toggleFocusMode = useWorkspaceStore((s) => s.toggleFocusMode);
  const specUrlInput = useWorkspaceStore((s) => s.specUrlInput);
  const setSpecUrlInput = useWorkspaceStore((s) => s.setSpecUrlInput);

  const parseBar = hasWorkspace ? (
    <div className={styles.parseBar}>
      <div className={styles.parseInner}>
        <MaterialIcon name="link" className={styles.parseLinkIcon} size="sm" />
        <label htmlFor="workspace-spec-url" className="srOnly">
          {t("landing.inputPlaceholder")}
        </label>
        <input
          id="workspace-spec-url"
          type="url"
          name="specUrl"
          autoComplete="url"
          placeholder={t("header.inputPlaceholderShort")}
          className={`${styles.parseInput} focusRing`}
          value={specUrlInput}
          onChange={(e) => setSpecUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onParse();
          }}
          aria-invalid={Boolean(parseError)}
          title={parseError ?? undefined}
        />
        <button
          type="button"
          className={`${styles.parseBtn} focusRing`}
          onClick={onParse}
          disabled={isParsing}
        >
          {isParsing ? t("common.loading") : t("landing.parseCta")}
          {!isParsing ? <MaterialIcon name="bolt" size="xs" /> : null}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={`${styles.menuBtn} focusRing`}
          aria-label={t("a11y.openExplorer")}
          onClick={() => setMobileSidebarOpen(true)}
        >
          <MaterialIcon name="menu" size="md" />
        </button>
        <AppLogo size={56} maxWidth={180} className={styles.brandLogo} />
        <span className={styles.brand} aria-label={t("common.appName")}>
          {t("common.appName")}
        </span>
      </div>

      {parseBar ? <div className={styles.center}>{parseBar}</div> : null}

      <div className={styles.right}>
        {hasWorkspace ? (
          <button
            type="button"
            className={`${styles.focusBtn} focusRing`}
            onClick={() => {
              setMobileSidebarOpen(false);
              toggleFocusMode();
            }}
            title={
              focusMode
                ? t("header.exitFocusMode")
                : t("header.enterFocusMode")
            }
            aria-pressed={focusMode}
            aria-label={
              focusMode
                ? t("header.exitFocusMode")
                : t("header.enterFocusMode")
            }
          >
            <MaterialIcon
              name={focusMode ? "close_fullscreen" : "open_in_full"}
              size="md"
            />
          </button>
        ) : null}
        <ThemeToggle t={t} />
        {hasWorkspace ? (
          <button
            type="button"
            className={`${styles.clearBtn} focusRing`}
            onClick={() => clearWorkspace()}
          >
            {t("header.clearWorkspace")}
          </button>
        ) : null}
      </div>
    </header>
  );
}
