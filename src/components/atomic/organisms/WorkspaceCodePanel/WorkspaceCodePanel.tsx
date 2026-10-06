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
import AiLimitBanner from "@/components/ai/AiLimitBanner";
import AiMarkdown from "@/components/ai/AiMarkdown";
import AiShimmer from "@/components/ai/AiShimmer";
import { copyWithToast, downloadText } from "@/components/ai/clipboard";
import { useProgressStatus } from "@/components/ai/useProgressStatus";
import { toast } from "@/components/providers/Toaster/toast";
import { useAiUsage } from "@/hooks/useAiUsage";
import { generationCacheKey, getGenerationCache } from "@/lib/generation-cache";
import type { GenerationScope, GroqStreamTab, OutputTab } from "@/types/api";
import btn from "@/components/atomic/atoms/Button/Button.module.css";
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
      return "md";
  }
}

function tabNeedsEndpointDisabled(id: OutputTab, endpointsCount: number): boolean {
  return id === "runApi" && endpointsCount === 0;
}

function tabMaterialIcon(id: OutputTab): string {
  switch (id) {
    case "runApi":
      return "send";
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

  const { result, loading, error, generate, stop, lastLatencyMs } =
    useGroqStream();
  const { exhausted } = useAiUsage();
  /** Key of the scope + tab the visible output belongs to; stale output is never shown for another one. */
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
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

  const streamTab: GroqStreamTab | null =
    activeTab === "typescript" || activeTab === "prompt" ? activeTab : null;

  const currentKey = useMemo(
    () =>
      streamTab && scoped.length > 0
        ? generationCacheKey(generationScope, scoped, streamTab)
        : null,
    [streamTab, scoped, generationScope],
  );
  const hasCurrent = currentKey != null && generatedKey === currentKey;

  const runGenerate = useCallback(
    (force: boolean) => {
      if (!streamTab || !currentKey || scoped.length === 0) return;
      setGeneratedKey(currentKey);
      void generate(scoped, generationScope, streamTab, {
        force,
        idePrompt:
          streamTab === "prompt" ? { scope: generationScope, operations: scoped } : undefined,
        allEndpoints: endpoints,
        primaryEndpoint: activeEndpoint,
      });
    },
    [streamTab, currentKey, scoped, generationScope, generate, endpoints, activeEndpoint],
  );

  // Output is generated on request (each run counts against the AI limit). Anything already
  // generated for this exact scope comes back from the cache without a request.
  useEffect(() => {
    if (!currentKey) return;
    if (getGenerationCache(currentKey) !== undefined) runGenerate(false);
  }, [currentKey, runGenerate]);

  useLayoutEffect(() => {
    if (!bodyRef.current) return;
    if (activeTab === "runApi") return;
    const y = scrollMemory.current[activeTab] ?? 0;
    bodyRef.current.scrollTop = y;
  }, [activeTab]);

  const displayText = useMemo(() => {
    if ((activeTab === "typescript" || activeTab === "prompt") && hasCurrent) {
      return result;
    }
    return "";
  }, [activeTab, result, hasCurrent]);

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

  /** What the output covers: "POST /pet" for one operation, the scope label for a collection. */
  const operationLabel = useMemo(() => {
    if (generationScope === "endpoint" && primaryForFile) {
      return `${primaryForFile.method.toUpperCase()} ${primaryForFile.path}`;
    }
    return scopeLabel;
  }, [generationScope, primaryForFile, scopeLabel]);

  const downloadName = useMemo(() => {
    const base = generationScope === "endpoint" ? fileSlug : "collection";
    return activeTab === "prompt"
      ? `${base}-prompt.${exportExtension("prompt")}`
      : `${base}.${exportExtension("typescript")}`;
  }, [generationScope, fileSlug, activeTab]);

  const outputName = activeTab === "prompt" ? "AI prompt" : "TypeScript";
  const readSubject =
    generationScope === "endpoint" && primaryForFile
      ? `the ${operationLabel} contract`
      : "the collection contract";
  const progressStatus = useProgressStatus(
    Boolean(streamTab) && hasCurrent && loading,
    activeTab === "prompt"
      ? [
          `Reading ${readSubject}…`,
          "Collecting parameters and responses…",
          "Writing the prompt…",
        ]
      : [
          `Reading ${readSubject}…`,
          "Resolving request and response schemas…",
          "Writing types…",
        ],
  );

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
    const ok = await copyWithToast(displayText, outputName);
    if (!ok) return;
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    setCopied(true);
    copyResetRef.current = setTimeout(() => {
      setCopied(false);
      copyResetRef.current = null;
    }, 2000);
  }, [displayText, outputName]);

  const onDownload = useCallback(() => {
    if (!displayText) return;
    const ok = downloadText(
      downloadName,
      displayText,
      activeTab === "prompt" ? "text/markdown" : "text/typescript",
    );
    if (ok) toast.success(`Saved ${downloadName}`, { id: "ai-download", duration: 2500 });
    else toast.error("Couldn't save the file", { description: "Copy the output instead.", id: "ai-download" });
  }, [displayText, downloadName, activeTab]);

  const onRegenerate = useCallback(() => runGenerate(true), [runGenerate]);

  const showCodeBody = activeTab === "typescript" || activeTab === "prompt";

  const showEmpty = showCodeBody && scoped.length > 0 && !hasCurrent;

  const showLoading =
    showCodeBody && scoped.length > 0 && hasCurrent && loading && !result;

  const streaming = showCodeBody && hasCurrent && loading && Boolean(result);

  const canUseStreamOutput = scoped.length > 0;

  const streamActionDisabled = !canUseStreamOutput || !displayText;

  const generateBlocked = !canUseStreamOutput || loading || exhausted;

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

  const editorActions = showCodeBody ? (
    <>
      <button
        type="button"
        className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing ${copied ? styles.chromeActionBtnCopied : ""}`}
        onClick={() => void onCopy()}
        disabled={streamActionDisabled}
        aria-label={`${copyLabel} ${outputName}`}
      >
        <MaterialIcon name={copied ? "check" : "content_copy"} size="xs" />
        <span className={styles.chromeActionLabel}>{copyLabel}</span>
      </button>
      <button
        type="button"
        className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing`}
        onClick={onDownload}
        disabled={streamActionDisabled || loading}
        aria-label={`Download ${downloadName}`}
      >
        <MaterialIcon name="download" size="xs" />
        <span className={styles.chromeActionLabel}>Download</span>
      </button>
      {hasCurrent ? (
        <button
          type="button"
          className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing`}
          onClick={onRegenerate}
          disabled={generateBlocked}
          aria-label={t("workspace.regenerate")}
        >
          <MaterialIcon name="refresh" size="xs" />
          <span className={styles.chromeActionLabel}>{t("workspace.regenerate")}</span>
        </button>
      ) : null}
    </>
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

      {activeTab !== "runApi" ? (
        <div className={styles.scopeContext} aria-label={t("workspace.generationScopeAria")}>
          <MaterialIcon name="terminal" size="xs" />
          <span className={styles.scopeContextText}>
            {t("workspace.scopeContext", { scope: scopeLabel })}
          </span>
        </div>
      ) : null}

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
        <div className={`${styles.editor} ${activeTab === "runApi" ? styles.editorFlat : ""}`}>
          {showCodeBody ? (
            <>
              <div className={styles.aiBanner}>
                <AiLimitBanner />
              </div>
              <EditorChrome
                fileLabel={operationLabel}
                fileMeta={activeTab === "prompt" ? "Markdown" : "TypeScript"}
                actions={editorActions}
              />
            </>
          ) : null}

          <div
            ref={bodyRef}
            className={`${styles.body} ${activeTab === "runApi" ? styles.bodyRunApi : ""} ${showCodeBody ? styles.bodyStream : ""} ${activeTab === "typescript" && showCodeBody && !showEmpty && !showLoading && !error ? styles.bodyTsForge : ""} ${activeTab === "prompt" && showCodeBody ? styles.bodyPrompt : ""}`}
            aria-live={showCodeBody ? "polite" : undefined}
            aria-busy={showCodeBody ? loading : undefined}
          >
            {bodyPlaceholder ? (
              <p className={styles.placeholder}>{bodyPlaceholder}</p>
            ) : activeTab === "runApi" ? (
              <RunApiPanel t={t} />
            ) : showEmpty ? (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyTitle}>
                  {activeTab === "prompt" ? "Generate an AI prompt" : "Generate TypeScript types"}
                </h3>
                <p className={styles.emptyText}>
                  {activeTab === "prompt"
                    ? `Builds a Markdown prompt for ${generationScope === "endpoint" ? operationLabel : "this collection"} with its parameters, bodies, and responses, ready to paste into your IDE assistant.`
                    : `Writes TypeScript interfaces and a typed client for ${generationScope === "endpoint" ? operationLabel : "this collection"} from its OpenAPI contract.`}
                </p>
                <div className={styles.emptyActions}>
                  <button
                    type="button"
                    className={`${btn.btn} ${btn.primary} ${btn.sm} focusRing`}
                    onClick={() => runGenerate(false)}
                    disabled={generateBlocked}
                  >
                    <MaterialIcon name="auto_awesome" size="xs" />
                    Generate
                  </button>
                  <span className={styles.emptyNote}>
                    {exhausted ? "No AI requests left in this window." : "Uses 1 AI request."}
                  </span>
                </div>
              </div>
            ) : showLoading ? (
              <div className={styles.loadingState}>
                <AiShimmer lines={5} />
                <div className={styles.loadingRow}>
                  <p className={styles.loadingText} role="status">
                    {progressStatus}
                  </p>
                  <button
                    type="button"
                    className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing`}
                    onClick={stop}
                  >
                    <MaterialIcon name="stop_circle" size="xs" />
                    Stop
                  </button>
                </div>
              </div>
            ) : error && !result ? (
              <div className={styles.error} role="alert">
                <MaterialIcon name="error" size="sm" className={styles.errorIcon} />
                <p className={styles.errorText}>
                  {error}. Nothing was generated.
                </p>
                <button
                  type="button"
                  className={`${btn.btn} ${btn.secondary} ${btn.sm} focusRing`}
                  onClick={onRegenerate}
                  disabled={generateBlocked}
                >
                  <MaterialIcon name="refresh" size="xs" />
                  Try again
                </button>
              </div>
            ) : activeTab === "typescript" ? (
              <HighlightedCode
                code={displayText || t("workspace.emptyOutput")}
                language="typescript"
                className={styles.highlighted}
                skin="forgeTs"
              />
            ) : (
              <AiMarkdown source={displayText} streaming={streaming} className={styles.promptMd} />
            )}
          </div>

          {showCodeBody ? (
            <div className={styles.footer}>
              <div className={styles.footerGroup}>
                <span className={styles.stats}>
                  {streaming
                    ? `${t("workspace.stats", { lines, chars })} · ${t("common.streaming")}`
                    : t("workspace.stats", { lines, chars })}
                </span>
                {streaming ? (
                  <span className={styles.streamStatus}>
                    <span className={styles.streamCaret} aria-hidden />
                    {progressStatus}
                  </span>
                ) : null}
              </div>
              <div className={styles.footerGroup}>
                {streaming ? (
                  <button
                    type="button"
                    className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing`}
                    onClick={stop}
                  >
                    <MaterialIcon name="stop_circle" size="xs" />
                    Stop
                  </button>
                ) : null}
                {lastLatencyMs != null && hasCurrent ? (
                  <span className={styles.latency}>
                    {t("footer.latency", { ms: lastLatencyMs })}
                  </span>
                ) : null}
                {lastGroqUsage != null && lastGroqUsage.totalTokens > 0 && hasCurrent ? (
                  <span className={styles.tokens} title={t("footer.tokensTitle")}>
                    {t("footer.tokensShort", {
                      total: lastGroqUsage.totalTokens,
                    })}
                  </span>
                ) : null}
              </div>
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
