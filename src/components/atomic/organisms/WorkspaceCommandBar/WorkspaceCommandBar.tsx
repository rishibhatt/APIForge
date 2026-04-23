"use client";

import { useCallback, useEffect, useId } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { WORKSPACE_SEARCH_INPUT_ID } from "@/constants/workspace-ui";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./WorkspaceCommandBar.module.css";

export interface WorkspaceCommandBarProps {
  t: TranslateFn;
}

export default function WorkspaceCommandBar({ t }: WorkspaceCommandBarProps) {
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const endpointSearch = useWorkspaceStore((s) => s.endpointSearch);
  const setEndpointSearch = useWorkspaceStore((s) => s.setEndpointSearch);
  const labelId = useId();

  const focusSearch = useCallback(() => {
    const el = document.getElementById(WORKSPACE_SEARCH_INPUT_ID);
    if (el instanceof HTMLInputElement) {
      el.focus();
      el.select();
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusSearch]);

  return (
    <div
      className={styles.bar}
      role="toolbar"
      aria-label={t("workspace.commandBarAria")}
    >
      <div className={styles.searchCluster}>
        <label id={labelId} htmlFor={WORKSPACE_SEARCH_INPUT_ID} className="srOnly">
          {t("header.searchWorkspace")}
        </label>
        <div className={styles.searchField}>
          <MaterialIcon
            name="search"
            className={styles.searchGlyph}
            size="sm"
          />
          <input
            id={WORKSPACE_SEARCH_INPUT_ID}
            type="search"
            className={styles.searchInput}
            placeholder={t("workspace.commandSearch")}
            value={endpointSearch}
            onChange={(e) => setEndpointSearch(e.target.value)}
            autoComplete="off"
            aria-labelledby={labelId}
          />
          <button
            type="button"
            className={styles.kbdButton}
            onClick={focusSearch}
            title={t("workspace.commandSearchKbdTitle")}
            aria-label={t("workspace.commandSearchKbdTitle")}
          >
            <kbd className={styles.kbd}>⌘</kbd>
            <kbd className={styles.kbd}>K</kbd>
          </button>
        </div>
      </div>
      <span className={styles.divider} aria-hidden />
      <div className={styles.icons}>
        <button
          type="button"
          className={styles.iconBtn}
          title={t("workspace.cmdNewEndpoint")}
          aria-label={t("workspace.cmdNewEndpoint")}
          onClick={() => setActiveTab("runApi")}
        >
          <MaterialIcon name="add_circle" size="md" />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          title={t("workspace.cmdImport")}
          aria-label={t("workspace.cmdImport")}
          aria-disabled={endpoints.length === 0}
          disabled={endpoints.length === 0}
          onClick={() => {
            /* noop */
          }}
        >
          <MaterialIcon name="publish" size="md" />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          title={t("workspace.cmdEnvironment")}
          aria-label={t("workspace.cmdEnvironment")}
          onClick={() => {
            /* noop */
          }}
        >
          <MaterialIcon name="hub" size="md" />
        </button>
      </div>
    </div>
  );
}
