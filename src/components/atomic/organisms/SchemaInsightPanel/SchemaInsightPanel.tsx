"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import btn from "@/components/atomic/atoms/Button/Button.module.css";
import HighlightedCode from "@/components/atomic/molecules/HighlightedCode/HighlightedCode";
import AiLimitBanner from "@/components/ai/AiLimitBanner";
import AiShimmer from "@/components/ai/AiShimmer";
import {
  AiRequestError,
  handleAiErrorResponse,
  handleAiThrown,
  isAbortError,
} from "@/components/ai/aiRequest";
import { copyWithToast } from "@/components/ai/clipboard";
import { useProgressStatus } from "@/components/ai/useProgressStatus";
import { reportAiHeaders, useAiUsage } from "@/hooks/useAiUsage";
import { parseUsageFromResponseHeaders } from "@/lib/groq-token-usage";
import { parameterType } from "@/lib/openapi-parameter-defaults";
import { getRequestBodyInfo } from "@/lib/request-body-example";
import { endpointToJsonSafe } from "@/lib/serialize-endpoint";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Endpoint } from "@/types/api";
import styles from "./SchemaInsightPanel.module.css";

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Top-level body properties, required first (OpenAPI 3 `requestBody` and Swagger 2 `in: body`). */
function extractBodyFields(endpoint: Endpoint): { name: string; hint: string }[] {
  const schema = getRequestBodyInfo(endpoint)?.schema;
  if (!isObject(schema)) return [];
  const props = schema.properties;
  if (!isObject(props)) return [];
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const names = [
    ...Object.keys(props).filter((n) => required.includes(n)),
    ...Object.keys(props).filter((n) => !required.includes(n)),
  ];
  return names.map((name) => {
    const p = props[name];
    const type = isObject(p) && typeof p.type === "string" ? p.type : "object";
    return { name, hint: `${required.includes(name) ? "required" : "optional"} · ${type}` };
  });
}

function extractParamRows(endpoint: Endpoint): { name: string; hint: string }[] {
  const p = endpoint.parameters;
  if (!Array.isArray(p)) return [];
  return p
    .map((item) => {
      if (!isObject(item)) return null;
      const inn = typeof item.in === "string" ? item.in : "";
      if (inn === "body") return null;
      const name = typeof item.name === "string" ? item.name : "?";
      const req = item.required === true;
      const hint = [inn, req ? "required" : "optional", parameterType(item)]
        .filter(Boolean)
        .join(" · ");
      return { name, hint };
    })
    .filter((x): x is { name: string; hint: string } => x !== null);
}

interface SchemaInsightPanelProps {
  t: TranslateFn;
  endpoint: Endpoint;
  /** Tighter layout beside Run API so the rail fits without horizontal overflow */
  compact?: boolean;
  /** OpenAPI request-body schema rubric — only relevant next to Run API */
  showRequestBodySection?: boolean;
}

export default function SchemaInsightPanel({
  t,
  endpoint,
  compact = false,
  showRequestBodySection = false,
}: SchemaInsightPanelProps) {
  const setLastGroqUsage = useWorkspaceStore((s) => s.setLastGroqUsage);
  const setLastGenerationMs = useWorkspaceStore((s) => s.setLastGenerationMs);
  const setPendingRequestBody = useWorkspaceStore((s) => s.setPendingRequestBody);
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const [nlPrompt, setNlPrompt] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [payloadCopied, setPayloadCopied] = useState(false);
  const [usedAsBody, setUsedAsBody] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nlError, setNlError] = useState<string | null>(null);
  const [nlOutput, setNlOutput] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runRef = useRef<() => Promise<void>>(async () => {});
  const { exhausted, resetIn } = useAiUsage();

  useEffect(() => {
    setNlPrompt("");
    setNlOutput(null);
    setNlError(null);
    abortRef.current?.abort();
    setNlLoading(false);
    setPayloadCopied(false);
    setUsedAsBody(false);
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }
  }, [endpoint.id]);

  const bodyFields = extractBodyFields(endpoint);
  const paramRows = extractParamRows(endpoint);
  const acceptsBody =
    getRequestBodyInfo(endpoint) != null &&
    !["GET", "HEAD"].includes(endpoint.method.toUpperCase());

  const onGeneratePayload = useCallback(async () => {
    const instruction = nlPrompt.trim();
    if (!instruction || exhausted) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setNlLoading(true);
    setNlError(null);
    setNlOutput(null);
    setUsedAsBody(false);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/groq/payload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: endpointToJsonSafe(endpoint),
          instruction,
        }),
        signal: ctrl.signal,
      });
      reportAiHeaders(res.headers);
      if (!res.ok) {
        throw await handleAiErrorResponse(res, { onRetry: () => void runRef.current() });
      }
      const usage = parseUsageFromResponseHeaders(res.headers);
      const data = (await res.json()) as { payload?: unknown };
      setNlOutput(JSON.stringify(data.payload, null, 2));
      setLastGenerationMs(Math.round(performance.now() - t0));
      if (usage) setLastGroqUsage(usage);
    } catch (e) {
      if (isAbortError(e)) return;
      const failure = e instanceof AiRequestError ? e : handleAiThrown(e, { onRetry: () => void runRef.current() });
      // Off-topic is a nudge, not a failure: keep the text so it can be edited.
      setNlError(failure.kind === "off_topic" ? null : failure.message || t("schemaInsight.payloadError"));
      setLastGroqUsage(null);
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setNlLoading(false);
      }
    }
  }, [endpoint, nlPrompt, exhausted, setLastGroqUsage, setLastGenerationMs, t]);

  useEffect(() => {
    runRef.current = onGeneratePayload;
  }, [onGeneratePayload]);

  const onStopPayload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setNlLoading(false);
  }, []);

  const opLabel = `${endpoint.method.toUpperCase()} ${endpoint.path}`;
  const progress = useProgressStatus(nlLoading, [
    `Reading the ${opLabel} schema…`,
    "Writing a payload that fits it…",
    "Checking required fields…",
  ]);

  const onCopyPayload = useCallback(async () => {
    if (!nlOutput) return;
    const ok = await copyWithToast(nlOutput, "Payload");
    if (!ok) return;
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    setPayloadCopied(true);
    copyResetRef.current = setTimeout(() => {
      setPayloadCopied(false);
      copyResetRef.current = null;
    }, 2000);
  }, [nlOutput]);

  const onUseAsBody = useCallback(() => {
    if (!nlOutput) return;
    setPendingRequestBody(endpoint.id, nlOutput);
    if (activeTab !== "runApi") setActiveTab("runApi");
    setUsedAsBody(true);
    document.getElementById("workspace-code")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [nlOutput, endpoint.id, setPendingRequestBody, activeTab, setActiveTab]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <aside
      className={`${styles.wrap} ${compact ? styles.wrapCompact : ""}`}
      aria-label={t("schemaInsight.aria")}
    >
      {paramRows.length > 0 ? (
        <section className={styles.rubricSection}>
          <h3 className={styles.sectionTitle}>{t("schemaInsight.parameters")}</h3>
          <div className={styles.card}>
            {paramRows.map((r) => (
              <div key={r.name} className={styles.row}>
                <code className={styles.name}>{r.name}</code>
                <span className={styles.hint}>{r.hint}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {showRequestBodySection ? (
        <section className={styles.rubricSection}>
          <h3 className={styles.sectionTitle}>{t("schemaInsight.requestBody")}</h3>
          {bodyFields.length === 0 ? (
            <p className={styles.empty}>{t("schemaInsight.noBody")}</p>
          ) : (
            <div className={styles.card}>
              {bodyFields.map((r) => (
                <div key={r.name} className={styles.row}>
                  <code className={styles.name}>{r.name}</code>
                  <span className={styles.hint}>{r.hint}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className={styles.payloadSection}>
        <h3 className={styles.sectionTitle}>{t("schemaInsight.payloadTitle")}</h3>
        <p className={styles.hintBlock}>{t("schemaInsight.payloadHint")}</p>
        <AiLimitBanner className={styles.banner} />
        <textarea
          className={styles.nlArea}
          rows={compact ? 2 : 3}
          value={nlPrompt}
          onChange={(e) => setNlPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void onGeneratePayload();
            }
          }}
          placeholder={
            exhausted
              ? `AI limit reached${resetIn ? `. Resets in ${resetIn}` : ""}`
              : t("schemaInsight.payloadPlaceholder")
          }
          disabled={nlLoading || exhausted}
          aria-label={t("schemaInsight.payloadPlaceholder")}
        />
        <div className={styles.payloadActions}>
          <button
            type="button"
            className={`${btn.btn} ${nlOutput ? btn.secondary : btn.primary} ${btn.sm} focusRing`}
            onClick={() => void onGeneratePayload()}
            disabled={nlLoading || exhausted || !nlPrompt.trim()}
            aria-busy={nlLoading}
          >
            <MaterialIcon name="auto_awesome" size="xs" />
            {t("schemaInsight.generatePayload")}
          </button>
          {nlLoading ? (
            <button
              type="button"
              className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing`}
              onClick={onStopPayload}
            >
              <MaterialIcon name="stop_circle" size="xs" />
              Stop
            </button>
          ) : null}
        </div>
        {nlLoading ? (
          <div className={styles.waiting}>
            <AiShimmer lines={4} />
            <p className={styles.progress} role="status">
              {progress}
            </p>
          </div>
        ) : null}
        {nlError ? (
          <p className={styles.nlError} role="alert">
            {nlError}
          </p>
        ) : null}
        {nlOutput ? (
          <div className={styles.result}>
            <div className={styles.nlPre}>
              <HighlightedCode code={nlOutput} language="json" wrap={false} />
            </div>
            <div className={styles.payloadActions}>
              {acceptsBody ? (
                <button
                  type="button"
                  className={`${btn.btn} ${btn.primary} ${btn.sm} focusRing`}
                  onClick={onUseAsBody}
                >
                  <MaterialIcon name={usedAsBody ? "check" : "input"} size="xs" />
                  {usedAsBody ? t("schemaInsight.usedAsBody") : t("schemaInsight.useAsBody")}
                </button>
              ) : null}
              <button
                type="button"
                className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing`}
                onClick={() => void onCopyPayload()}
              >
                <MaterialIcon name={payloadCopied ? "check" : "content_copy"} size="xs" />
                {payloadCopied ? t("workspace.copied") : t("schemaInsight.payloadCopy")}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
