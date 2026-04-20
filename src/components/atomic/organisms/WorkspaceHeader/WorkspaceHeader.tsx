"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import ThemeToggle from "@/components/atomic/molecules/ThemeToggle/ThemeToggle";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./WorkspaceHeader.module.css";

export interface WorkspaceHeaderProps {
  t: TranslateFn;
  hasWorkspace: boolean;
  isLoading: boolean;
  onForge: () => void;
}

export default function WorkspaceHeader({
  t,
  hasWorkspace,
  isLoading,
  onForge,
}: WorkspaceHeaderProps) {
  const specUrlInput = useWorkspaceStore((s) => s.specUrlInput);
  const setSpecUrlInput = useWorkspaceStore((s) => s.setSpecUrlInput);
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);
  const setMobileSidebarOpen = useWorkspaceStore((s) => s.setMobileSidebarOpen);

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
        <span className={styles.brand} aria-label={t("common.appName")}>
          <span className={styles.brandFull} aria-hidden>
            {t("common.appName")}
          </span>
          <span className={styles.brandShort} aria-hidden>
            {t("common.appNameShort")}
          </span>
        </span>
      </div>
      {hasWorkspace ? (
        <div className={styles.urlBar}>
          <MaterialIcon name="link" className={styles.urlIcon} size="sm" />
          <label htmlFor="header-spec-url" className="srOnly">
            {t("hero.inputPlaceholder")}
          </label>
          <input
            id="header-spec-url"
            type="url"
            name="specUrl"
            autoComplete="url"
            placeholder={t("header.inputPlaceholderShort")}
            title={t("hero.inputPlaceholder")}
            className={styles.input}
            value={specUrlInput}
            onChange={(e) => setSpecUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onForge();
            }}
          />
          {specUrlInput.trim().length > 0 ? (
            <button
              type="button"
              className={`${styles.clearInputBtn} focusRing`}
              onClick={() => setSpecUrlInput("")}
              aria-label={t("a11y.clearUrlInput")}
            >
              <MaterialIcon name="close" size="sm" />
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.forgeBtn} focusRing`}
            onClick={onForge}
            disabled={isLoading}
          >
            {isLoading ? (
              t("common.loading")
            ) : (
              <>
                <span className={styles.forgeLabelFull}>{t("hero.forgeCta")}</span>
                <span className={styles.forgeLabelShort}>{t("hero.forgeCtaShort")}</span>
              </>
            )}
          </button>
        </div>
      ) : null}
      <div className={styles.right}>
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
