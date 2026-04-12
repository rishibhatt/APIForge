"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import EditorChrome from "@/components/atomic/molecules/EditorChrome/EditorChrome";
import { useGroqStream } from "@/hooks/useGroqStream";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { OutputTab } from "@/types/api";
import styles from "./WorkspaceCodePanel.module.css";

const TAB_ORDER: OutputTab[] = [
  "markdown",
  "typescript",
  "prompt",
  "snippet",
];

interface WorkspaceCodePanelProps {
  t: TranslateFn;
}

function tabLabelKey(tab: OutputTab): string {
  switch (tab) {
    case "markdown":
      return "workspace.tabs.markdown";
    case "typescript":
      return "workspace.tabs.typescript";
    case "prompt":
      return "workspace.tabs.aiPrompt";
    case "snippet":
      return "workspace.tabs.codeSnippet";
    default:
      return "";
  }
}

function exportExtension(tab: OutputTab): string {
  if (tab === "markdown") return "md";
  if (tab === "typescript") return "ts";
  return "txt";
}

export default function WorkspaceCodePanel({ t }: WorkspaceCodePanelProps) {
  const activeEndpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const { result, loading, error, generate, lastLatencyMs } = useGroqStream();

  useEffect(() => {
    if (!activeEndpoint) return;
    void generate(activeEndpoint, activeTab);
  }, [activeEndpoint, activeTab, generate]);

  const lines = useMemo(
    () => (result ? result.split("\n").length : 0),
    [result],
  );
  const chars = result.length;

  const fileSlug = useMemo(() => {
    if (!activeEndpoint) return "output";
    const s = activeEndpoint.path
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    return s || "output";
  }, [activeEndpoint]);

  const onCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      /* ignore */
    }
  }, [result]);

  const onExport = useCallback(() => {
    if (!result || !activeEndpoint) return;
    const ext = exportExtension(activeTab);
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apiforge-${fileSlug}-${activeTab}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, activeEndpoint, activeTab, fileSlug]);

  const onRegenerate = useCallback(() => {
    if (!activeEndpoint) return;
    void generate(activeEndpoint, activeTab, { force: true });
  }, [activeEndpoint, activeTab, generate]);

  const dynamicFileLabel = activeEndpoint
    ? `${fileSlug}.${exportExtension(activeTab)}`
    : t("workspace.fileLabelIdle");

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.tabList} role="tablist" aria-label={t("workspace.previewAria")}>
          {TAB_ORDER.map((id) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tab} focusRing ${isActive ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(id)}
              >
                {t(tabLabelKey(id))}
              </button>
            );
          })}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btnGhost} focusRing`}
            onClick={onExport}
            disabled={!result || !activeEndpoint}
          >
            {t("workspace.export")}
            <MaterialIcon name="expand_more" size="xs" />
          </button>
          <button
            type="button"
            className={`${styles.btnPrimary} focusRing`}
            onClick={onCopy}
            disabled={!result}
          >
            <MaterialIcon name="content_copy" size="xs" />
            {t("workspace.copy")}
          </button>
          <button
            type="button"
            className={`${styles.btnGhost} focusRing`}
            onClick={onRegenerate}
            disabled={!activeEndpoint || loading}
          >
            <MaterialIcon name="refresh" size="xs" />
            {t("workspace.regenerate")}
          </button>
        </div>
      </div>

      <div className={styles.editor}>
        <EditorChrome
          fileLabel={dynamicFileLabel}
          fileMeta={t(`workspace.meta.${activeTab}`)}
        />

        <div className={styles.body}>
          {!activeEndpoint ? (
            <p className={styles.placeholder}>{t("workspace.selectEndpoint")}</p>
          ) : loading && !result ? (
            <p className={styles.placeholder}>{t("common.loading")}</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : (
            <pre className={styles.code}>{result || t("workspace.emptyOutput")}</pre>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.stats}>
            {loading
              ? `${t("workspace.stats", { lines, chars })} · ${t("common.streaming")}`
              : t("workspace.stats", { lines, chars })}
          </span>
          {lastLatencyMs != null ? (
            <span className={styles.latency}>
              {t("footer.latency", { ms: lastLatencyMs })}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
