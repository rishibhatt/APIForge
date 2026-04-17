"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import EditorChrome from "@/components/atomic/molecules/EditorChrome/EditorChrome";
import SchemaInsightPanel from "@/components/atomic/organisms/SchemaInsightPanel/SchemaInsightPanel";
import TestGenerationPanel from "@/components/atomic/organisms/WorkspaceCodePanel/TestGenerationPanel";
import { useGroqStream } from "@/hooks/useGroqStream";
import { getScopedEndpoints, getScopeLabel } from "@/lib/endpoint-groups";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { GenerationScope, GroqStreamTab, OutputTab } from "@/types/api";
import styles from "./WorkspaceCodePanel.module.css";

const TAB_ORDER: OutputTab[] = ["typescript", "prompt", "testGeneration"];

interface WorkspaceCodePanelProps {
  t: TranslateFn;
}

function tabLabelKey(tab: OutputTab): string {
  switch (tab) {
    case "typescript":
      return "workspace.tabs.typescript";
    case "prompt":
      return "workspace.tabs.aiPrompt";
    case "testGeneration":
      return "workspace.tabs.testGeneration";
    default:
      return "";
  }
}

function exportExtension(tab: GroqStreamTab): string {
  switch (tab) {
    case "typescript":
      return "ts";
    case "prompt":
      return "txt";
  }
}

function workspaceMetaKey(tab: GroqStreamTab): string {
  switch (tab) {
    case "typescript":
      return "workspace.meta.typescript";
    case "prompt":
      return "workspace.meta.prompt";
  }
}

function tabNeedsEndpointDisabled(id: OutputTab, endpointsCount: number): boolean {
  return id === "testGeneration" && endpointsCount === 0;
}

export default function WorkspaceCodePanel({ t }: WorkspaceCodePanelProps) {
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const activeEndpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const generationScope = useWorkspaceStore((s) => s.generationScope);
  const setGenerationScope = useWorkspaceStore((s) => s.setGenerationScope);

  const { result, loading, error, generate, lastLatencyMs } = useGroqStream();

  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollMemory = useRef<Partial<Record<OutputTab, number>>>({});

  const scoped = useMemo(
    () => getScopedEndpoints(endpoints, activeEndpoint, generationScope),
    [endpoints, activeEndpoint, generationScope],
  );

  const scopeLabel = useMemo(
    () => getScopeLabel(endpoints, activeEndpoint, generationScope, scoped),
    [endpoints, activeEndpoint, generationScope, scoped],
  );

  const primaryForFile = activeEndpoint ?? scoped[0] ?? null;

  useEffect(() => {
    if (activeTab !== "typescript") return;
    if (scoped.length === 0) return;
    void generate(scoped, generationScope, "typescript", {
      primaryEndpoint: activeEndpoint,
      allEndpoints: endpoints,
    });
  }, [
    activeEndpoint,
    activeTab,
    generationScope,
    scoped,
    endpoints,
    generate,
  ]);

  useEffect(() => {
    if (activeTab !== "prompt") return;
    if (scoped.length === 0) return;
    void generate(scoped, generationScope, "prompt", {
      idePrompt: { scope: generationScope, operations: scoped },
      allEndpoints: endpoints,
      primaryEndpoint: activeEndpoint,
    });
  }, [
    activeEndpoint,
    activeTab,
    generationScope,
    scoped,
    endpoints,
    generate,
  ]);

  useLayoutEffect(() => {
    if (!bodyRef.current) return;
    if (activeTab === "testGeneration") return;
    const y = scrollMemory.current[activeTab] ?? 0;
    bodyRef.current.scrollTop = y;
  }, [activeTab]);

  const displayText = useMemo(() => {
    if (activeTab === "typescript" || activeTab === "prompt") {
      return result;
    }
    return "";
  }, [activeTab, result]);

  const lines = useMemo(
    () => (displayText ? displayText.split("\n").length : 0),
    [displayText],
  );
  const chars = displayText.length;

  const fileSlug = useMemo(() => {
    if (!primaryForFile) return "output";
    const s = primaryForFile.path
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    return s || "output";
  }, [primaryForFile]);

  const dynamicFileLabel = useMemo(() => {
    if (!primaryForFile) return t("workspace.fileLabelIdle");
    if (activeTab === "prompt") return "ide-prompt.txt";
    if (activeTab === "testGeneration") return "tests.json";
    if (activeTab === "typescript") {
      return `${fileSlug}.${exportExtension(activeTab)}`;
    }
    return t("workspace.fileLabelIdle");
  }, [primaryForFile, activeTab, fileSlug, t]);

  const onSelectTab = useCallback(
    (id: OutputTab) => {
      if (bodyRef.current) {
        scrollMemory.current[activeTab] = bodyRef.current.scrollTop;
      }
      setActiveTab(id);
    },
    [activeTab, setActiveTab],
  );

  const onCopy = useCallback(async () => {
    if (!displayText) return;
    try {
      await navigator.clipboard.writeText(displayText);
    } catch {
      /* ignore */
    }
  }, [displayText]);

  const onExport = useCallback(() => {
    if (!displayText || !primaryForFile) return;
    if (activeTab === "testGeneration") return;
    const ext = exportExtension(activeTab as GroqStreamTab);
    const blob = new Blob([displayText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apiforge-${fileSlug}-${activeTab}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayText, primaryForFile, activeTab, fileSlug]);

  const onRegenerate = useCallback(() => {
    if (scoped.length === 0) return;
    if (activeTab === "typescript" || activeTab === "prompt") {
      void generate(scoped, generationScope, activeTab, {
        force: true,
        idePrompt:
          activeTab === "prompt"
            ? { scope: generationScope, operations: scoped }
            : undefined,
        allEndpoints: activeTab === "prompt" ? endpoints : undefined,
        primaryEndpoint: activeEndpoint,
      });
    }
  }, [
    activeEndpoint,
    activeTab,
    generate,
    generationScope,
    scoped,
    endpoints,
  ]);

  const showCodeBody = activeTab !== "testGeneration";

  const showLoading =
    showCodeBody &&
    scoped.length > 0 &&
    loading &&
    !result &&
    (activeTab === "typescript" || activeTab === "prompt");

  const canUseStreamOutput = scoped.length > 0;

  const actionDisabled =
    !canUseStreamOutput || activeTab === "testGeneration";

  const bodyPlaceholder = (() => {
    if (endpoints.length === 0) return t("workspace.selectEndpoint");
    if (scoped.length === 0) return t("workspace.scopedEmpty");
    return null;
  })();

  return (
    <div id="workspace-code" className={styles.wrap}>
      <div className={styles.scopeContext} aria-label={t("workspace.generationScopeAria")}>
        <MaterialIcon name="terminal" size="xs" />
        <span className={styles.scopeContextText}>
          {t("workspace.scopeContext", { scope: scopeLabel })}
        </span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.tabList} role="tablist" aria-label={t("workspace.previewAria")}>
          {TAB_ORDER.map((id) => {
            const isActive = activeTab === id;
            const disabled = tabNeedsEndpointDisabled(id, endpoints.length);
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                disabled={disabled}
                className={`${styles.tab} focusRing ${isActive ? styles.tabActive : ""} ${disabled ? styles.tabDisabled : ""}`}
                onClick={() => onSelectTab(id)}
              >
                <span className={styles.tabInner}>
                  {id === "testGeneration" ? (
                    <MaterialIcon name="science" size="xs" />
                  ) : null}
                  {t(tabLabelKey(id))}
                </span>
              </button>
            );
          })}
        </div>
        <div className={styles.actions}>
          <div className={styles.scopeSegment} role="group" aria-label={t("workspace.generationScopeAria")}>
            {(
              [
                ["endpoint", "workspace.levelEndpoint"],
                ["collection", "workspace.levelCollection"],
                ["api", "workspace.levelApi"],
              ] as const
            ).map(([value, labelKey]) => {
              const isActive = generationScope === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`${styles.scopeSegBtn} focusRing ${isActive ? styles.scopeSegBtnActive : ""}`}
                  disabled={endpoints.length === 0}
                  onClick={() => setGenerationScope(value as GenerationScope)}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={`${styles.btnGhost} focusRing`}
            onClick={onExport}
            disabled={actionDisabled || !displayText}
          >
            {t("workspace.export")}
            <MaterialIcon name="expand_more" size="xs" />
          </button>
          <button
            type="button"
            className={`${styles.btnPrimary} focusRing`}
            onClick={onCopy}
            disabled={actionDisabled || !displayText}
          >
            <MaterialIcon name="content_copy" size="xs" />
            {t("workspace.copy")}
          </button>
          <button
            type="button"
            className={`${styles.btnGhost} focusRing`}
            onClick={onRegenerate}
            disabled={
              !canUseStreamOutput ||
              loading ||
              activeTab === "testGeneration"
            }
          >
            <MaterialIcon name="refresh" size="xs" />
            {t("workspace.regenerate")}
          </button>
        </div>
      </div>

      <div className={styles.workspaceGrid}>
        <div className={styles.editor}>
          {showCodeBody ? (
            <EditorChrome
              fileLabel={dynamicFileLabel}
              fileMeta={t(workspaceMetaKey(activeTab as GroqStreamTab))}
            />
          ) : null}

          <div ref={bodyRef} className={styles.body}>
            {bodyPlaceholder ? (
              <p className={styles.placeholder}>{bodyPlaceholder}</p>
            ) : activeTab === "testGeneration" ? (
              <TestGenerationPanel t={t} />
            ) : showLoading ? (
              <p className={styles.placeholder}>{t("common.loading")}</p>
            ) : error ? (
              <p className={styles.error}>{error}</p>
            ) : (
              <>
                {activeTab === "prompt" ? (
                  <p className={styles.idePromptHint}>{t("workspace.idePromptHint")}</p>
                ) : null}
                <pre className={styles.code}>
                  {displayText || t("workspace.emptyOutput")}
                </pre>
              </>
            )}
          </div>

          {showCodeBody ? (
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
          ) : null}
        </div>

        {primaryForFile ? (
          <div className={styles.insight}>
            <SchemaInsightPanel t={t} endpoint={primaryForFile} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
