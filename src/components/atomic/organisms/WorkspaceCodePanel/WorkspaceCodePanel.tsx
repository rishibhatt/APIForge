"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import EndpointStrip from "@/components/atomic/organisms/EndpointStrip/EndpointStrip";
import EditorChrome from "@/components/atomic/molecules/EditorChrome/EditorChrome";
import HighlightedCode from "@/components/atomic/molecules/HighlightedCode/HighlightedCode";
import SchemaInsightPanel from "@/components/atomic/organisms/SchemaInsightPanel/SchemaInsightPanel";
import WorkspaceAiChatDock from "@/components/atomic/organisms/WorkspaceAiChatDock/WorkspaceAiChatDock";
import QualityScoreTeaser from "@/components/atomic/organisms/WorkspaceQualityScore/QualityScoreTeaser";
import {
  buildWorkspaceAssistantApiContext,
  type WorkspaceAssistantApiContext,
} from "@/lib/workspace-assistant-context";
import RunApiPanel from "@/components/atomic/organisms/WorkspaceCodePanel/RunApiPanel";
import { useGroqStream } from "@/hooks/useGroqStream";
import { getScopedEndpoints, getScopeLabel } from "@/lib/endpoint-groups";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { GenerationScope, GroqStreamTab, OutputTab } from "@/types/api";
import styles from "./WorkspaceCodePanel.module.css";

const TAB_ORDER: OutputTab[] = ["runApi", "typescript", "prompt"];

interface WorkspaceCodePanelProps {
  t: TranslateFn;
}

function tabLabelKey(tab: OutputTab): string {
  switch (tab) {
    case "typescript":
      return "workspace.tabs.typescript";
    case "prompt":
      return "workspace.tabs.aiPrompt";
    case "runApi":
      return "workspace.tabs.runApi";
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
  return id === "runApi" && endpointsCount === 0;
}

function tabMaterialIcon(id: OutputTab): string {
  switch (id) {
    case "runApi":
      return "bolt";
    case "typescript":
      return "code_blocks";
    case "prompt":
      return "text_snippet";
    default:
      return "code_blocks";
  }
}

export default function WorkspaceCodePanel({ t }: WorkspaceCodePanelProps) {
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const activeEndpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const generationScope = useWorkspaceStore((s) => s.generationScope);
  const setGenerationScope = useWorkspaceStore((s) => s.setGenerationScope);

  const { result, loading, error, generate, lastLatencyMs } = useGroqStream();
  const lastGroqUsage = useWorkspaceStore((s) => s.lastGroqUsage);
  const focusMode = useWorkspaceStore((s) => s.focusMode);
  const specTitle = useWorkspaceStore((s) => s.specTitle);
  const specVersion = useWorkspaceStore((s) => s.specVersion);

  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollMemory = useRef<Partial<Record<OutputTab, number>>>({});
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (generationScope === "api") {
      setGenerationScope("collection");
    }
  }, [generationScope, setGenerationScope]);

  useEffect(() => {
    setCopied(false);
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const scoped = useMemo(
    () => getScopedEndpoints(endpoints, activeEndpoint, generationScope),
    [endpoints, activeEndpoint, generationScope],
  );

  const scopeLabel = useMemo(
    () => getScopeLabel(endpoints, activeEndpoint, generationScope, scoped),
    [endpoints, activeEndpoint, generationScope, scoped],
  );

  const primaryForFile = activeEndpoint ?? scoped[0] ?? null;
  /** Schema + AI payload generator: keep visible on every tab (not only Run API). */
  const showInsightRail = Boolean(primaryForFile && !focusMode);
  const narrowInsightRail = activeTab === "runApi";

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
    if (activeTab === "runApi") return;
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
    if (activeTab === "runApi") return "request";
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
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      setCopied(true);
      copyResetRef.current = setTimeout(() => {
        setCopied(false);
        copyResetRef.current = null;
      }, 2000);
    } catch {
      /* ignore */
    }
  }, [displayText]);

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

  const showCodeBody = activeTab === "typescript" || activeTab === "prompt";

  const showLoading =
    showCodeBody &&
    scoped.length > 0 &&
    loading &&
    !result &&
    (activeTab === "typescript" || activeTab === "prompt");

  const canUseStreamOutput = scoped.length > 0;

  const streamActionDisabled = !canUseStreamOutput || !displayText;

  const bodyPlaceholder = (() => {
    if (endpoints.length === 0) return t("workspace.selectEndpoint");
    if (scoped.length === 0) return t("workspace.scopedEmpty");
    return null;
  })();

  const showAssistant = endpoints.length > 0 && scoped.length > 0;

  const assistantApiContext: WorkspaceAssistantApiContext = useMemo(
    () =>
      buildWorkspaceAssistantApiContext({
        specTitle,
        specVersion,
        endpoints,
        activeEndpoint,
        activeTabLabel: t(tabLabelKey(activeTab)),
        scopeLabel,
        defaultSpecName: t("workspace.workspaceLabel"),
      }),
    [specTitle, specVersion, endpoints, activeEndpoint, activeTab, scopeLabel, t],
  );

  const copyLabel = copied ? t("workspace.copied") : t("workspace.copy");

  const editorActions =
    activeTab === "typescript" ? (
      <>
        <button
          type="button"
          className={`${styles.chromeActionBtn} focusRing ${copied ? styles.chromeActionBtnCopied : ""}`}
          onClick={() => void onCopy()}
          disabled={streamActionDisabled}
          aria-label={copyLabel}
        >
          <MaterialIcon name={copied ? "check" : "content_copy"} size="xs" />
          <span className={styles.chromeActionLabel}>{copyLabel}</span>
        </button>
        <button
          type="button"
          className={`${styles.chromeActionBtn} focusRing`}
          onClick={onRegenerate}
          disabled={!canUseStreamOutput || loading}
          aria-label={t("workspace.regenerate")}
        >
          <MaterialIcon name="refresh" size="xs" />
          <span className={styles.chromeActionLabel}>{t("workspace.regenerate")}</span>
        </button>
      </>
    ) : activeTab === "prompt" ? (
      <button
        type="button"
        className={`${styles.chromeActionBtn} focusRing ${copied ? styles.chromeActionBtnCopied : ""}`}
        onClick={() => void onCopy()}
        disabled={streamActionDisabled}
        aria-label={copyLabel}
      >
        <MaterialIcon name={copied ? "check" : "content_copy"} size="xs" />
        <span className={styles.chromeActionLabel}>{copyLabel}</span>
      </button>
    ) : null;

  return (
    <div
      id="workspace-code"
      className={`${styles.wrap} ${focusMode ? styles.wrapFocus : ""}`}
    >
      {endpoints.length > 0 ? <QualityScoreTeaser t={t} /> : null}
      {activeEndpoint ? (
        <div className={styles.endpointSummary}>
          <EndpointStrip
            t={t}
            endpoint={activeEndpoint}
            className={styles.endpointSummaryStrip}
          />
        </div>
      ) : null}

      <div className={styles.scopeContext} aria-label={t("workspace.generationScopeAria")}>
        <MaterialIcon name="terminal" size="xs" />
        <span className={styles.scopeContextText}>
          {t("workspace.scopeContext", { scope: scopeLabel })}
        </span>
      </div>

      <div
        className={`${styles.toolbar} ${activeTab === "runApi" ? styles.toolbarRunApiOnly : ""}`}
      >
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
                  <MaterialIcon name={tabMaterialIcon(id)} size="xs" />
                  {t(tabLabelKey(id))}
                </span>
              </button>
            );
          })}
        </div>
        {activeTab === "typescript" || activeTab === "prompt" ? (
          <div className={styles.scopeSegment} role="group" aria-label={t("workspace.generationScopeAria")}>
            {(
              [
                ["endpoint", "workspace.levelEndpoint"],
                ["collection", "workspace.levelCollection"],
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
        ) : null}
      </div>

      <div
        className={`${styles.workspaceGrid} ${focusMode ? styles.workspaceGridFocus : ""} ${showInsightRail ? styles.workspaceGridWithInsight : ""} ${showInsightRail && narrowInsightRail ? styles.workspaceGridRunSplit : ""}`}
      >
        <div className={styles.editor}>
          {showCodeBody ? (
            <EditorChrome
              fileLabel={dynamicFileLabel}
              fileMeta={t(workspaceMetaKey(activeTab as GroqStreamTab))}
              actions={editorActions}
            />
          ) : null}

          <div
            ref={bodyRef}
            className={`${styles.body} ${activeTab === "runApi" ? styles.bodyRunApi : ""} ${showCodeBody ? styles.bodyStream : ""} ${activeTab === "typescript" && showCodeBody ? styles.bodyTsForge : ""} ${activeTab === "prompt" && showCodeBody ? styles.bodyPrompt : ""}`}
          >
            {bodyPlaceholder ? (
              <p className={styles.placeholder}>{bodyPlaceholder}</p>
            ) : activeTab === "runApi" ? (
              <RunApiPanel t={t} />
            ) : showLoading ? (
              <p className={styles.placeholder}>{t("common.loading")}</p>
            ) : error ? (
              <p className={styles.error}>{error}</p>
            ) : activeTab === "typescript" ? (
              <HighlightedCode
                code={displayText || t("workspace.emptyOutput")}
                language="typescript"
                className={styles.highlighted}
                skin="forgeTs"
              />
            ) : (
              <HighlightedCode
                code={displayText || t("workspace.emptyOutput")}
                language="markdown"
                className={styles.highlighted}
              />
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
              {lastGroqUsage != null && lastGroqUsage.totalTokens > 0 ? (
                <span className={styles.tokens} title={t("footer.tokensTitle")}>
                  {t("footer.tokensShort", {
                    total: lastGroqUsage.totalTokens,
                  })}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {showInsightRail && primaryForFile ? (
          <div className={styles.insight}>
            <SchemaInsightPanel
              t={t}
              endpoint={primaryForFile}
              compact={narrowInsightRail}
              showRequestBodySection={activeTab === "runApi"}
            />
          </div>
        ) : null}
      </div>

      {showAssistant ? (
        <WorkspaceAiChatDock t={t} apiContext={assistantApiContext} />
      ) : null}
    </div>
  );
}
