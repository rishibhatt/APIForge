"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import HighlightedCode from "@/components/atomic/molecules/HighlightedCode/HighlightedCode";
import type { HighlightLanguage } from "@/components/atomic/molecules/HighlightedCode/HighlightedCode";
import { executeTestRequestClient, joinBaseAndPath } from "@/lib/execute-test-request";
import {
  authHintSummary,
  authHintsForOperation,
} from "@/lib/openapi-auth-resolve";
import { parameterExampleString } from "@/lib/openapi-parameter-defaults";
import { parseUsageFromResponseHeaders } from "@/lib/groq-token-usage";
import { endpointToJsonSafe } from "@/lib/serialize-endpoint";
import type { SchemaValidationIssue } from "@/lib/validate-response-against-schema";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Endpoint } from "@/types/api";
import type {
  ApiExecutionRequest,
  ApiExecutionResult,
  ExecutionMode,
  ExecutionStatusStep,
} from "@/types/execution";
import styles from "./RunApiPanel.module.css";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function parseParamRows(endpoint: Endpoint): {
  name: string;
  inn: string;
  spec: Record<string, unknown>;
}[] {
  const p = endpoint.parameters;
  if (!Array.isArray(p)) return [];
  return p
    .map((item) => {
      if (!isObject(item)) return null;
      const name = typeof item.name === "string" ? item.name : "";
      const inn = typeof item.in === "string" ? item.in : "";
      if (!name || !inn) return null;
      return { name, inn, spec: item };
    })
    .filter((x): x is { name: string; inn: string; spec: Record<string, unknown> } => x !== null);
}

type ResponseTab = "body" | "headers" | "tests";
type BodyView = "pretty" | "raw" | "preview";

export default function RunApiPanel({ t }: { t: TranslateFn }) {
  const endpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const specServerUrls = useWorkspaceStore((s) => s.specServerUrls);
  const specSecuritySchemes = useWorkspaceStore((s) => s.specSecuritySchemes);
  const workspaceDefaultBearer = useWorkspaceStore((s) => s.workspaceDefaultBearer);
  const setWorkspaceDefaultBearer = useWorkspaceStore((s) => s.setWorkspaceDefaultBearer);
  const executionMode = useWorkspaceStore((s) => s.executionMode);
  const setExecutionMode = useWorkspaceStore((s) => s.setExecutionMode);
  const setLastGroqUsage = useWorkspaceStore((s) => s.setLastGroqUsage);

  const [baseUrl, setBaseUrl] = useState("");
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [headersText, setHeadersText] = useState("{}");
  const [bodyText, setBodyText] = useState("");
  const [bearer, setBearer] = useState("");
  const [basicUser, setBasicUser] = useState("");
  const [basicPass, setBasicPass] = useState("");
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKeyIn, setApiKeyIn] = useState<"header" | "query">("header");
  const [apiKeyValue, setApiKeyValue] = useState("");

  const [sending, setSending] = useState(false);
  const [statusStep, setStatusStep] = useState<ExecutionStatusStep>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [corsErrorResult, setCorsErrorResult] = useState<ApiExecutionResult | null>(null);
  const [securityBlockResult, setSecurityBlockResult] = useState<ApiExecutionResult | null>(null);
  const [executionResult, setExecutionResult] = useState<ApiExecutionResult | null>(null);

  const [status, setStatus] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [parsedBody, setParsedBody] = useState<unknown>(null);
  const [responseHeaders, setResponseHeaders] = useState<[string, string][]>([]);

  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [bodyView, setBodyView] = useState<BodyView>("pretty");
  const [responseExpanded, setResponseExpanded] = useState(false);

  const [valLoading, setValLoading] = useState(false);
  const [issues, setIssues] = useState<SchemaValidationIssue[] | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [responseCopied, setResponseCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hints = useMemo(
    () => authHintsForOperation(specSecuritySchemes ?? undefined, endpoint?.security),
    [specSecuritySchemes, endpoint?.security],
  );

  const hintLine = useMemo(() => authHintSummary(hints), [hints]);

  const pathParams = useMemo(
    () => (endpoint ? parseParamRows(endpoint).filter((r) => r.inn === "path") : []),
    [endpoint],
  );
  const queryParams = useMemo(
    () => (endpoint ? parseParamRows(endpoint).filter((r) => r.inn === "query") : []),
    [endpoint],
  );

  useEffect(() => {
    if (!endpoint) return;
    const pv: Record<string, string> = {};
    const qv: Record<string, string> = {};
    for (const row of parseParamRows(endpoint)) {
      const d = parameterExampleString(row.spec);
      if (row.inn === "path") pv[row.name] = d;
      if (row.inn === "query") qv[row.name] = d;
    }
    setPathValues(pv);
    setQueryValues(qv);
    setBodyText(endpoint.requestBody != null ? "{}" : "");
    setHeadersText("{}");
    setSendError(null);
    setCorsErrorResult(null);
    setSecurityBlockResult(null);
    setExecutionResult(null);
    setStatus(null);
    setElapsedMs(null);
    setResponseText(null);
    setParsedBody(null);
    setResponseHeaders([]);
    setResponseTab("body");
    setBodyView("pretty");
    setResponseExpanded(false);
    setIssues(null);
    setExplanation(null);
    const first = specServerUrls[0]?.trim() ?? "";
    setBaseUrl((prev) => (prev.trim() ? prev : first));
    const ah = authHintsForOperation(
      specSecuritySchemes ?? undefined,
      endpoint.security,
    );
    const ak = ah.find((x) => x.kind === "apiKey");
    if (ak?.apiKeyName) setApiKeyName(ak.apiKeyName);
    if (ak?.apiKeyIn === "query" || ak?.apiKeyIn === "header") {
      setApiKeyIn(ak.apiKeyIn === "query" ? "query" : "header");
    }
  }, [endpoint, specServerUrls, specSecuritySchemes]);

  const resolvedPath = useMemo(() => {
    if (!endpoint) return "";
    let p = endpoint.path;
    for (const [k, v] of Object.entries(pathValues)) {
      p = p.replace(new RegExp(`\\{${escapeRe(k)}\\}`, "g"), encodeURIComponent(v));
    }
    return p;
  }, [endpoint, pathValues]);

  const wantsBody = useMemo(() => {
    if (!endpoint) return false;
    const m = endpoint.method.toUpperCase();
    if (m === "GET" || m === "HEAD") return false;
    return endpoint.requestBody != null;
  }, [endpoint]);

  const executeWithMode = useCallback(
    async (modeToUse: ExecutionMode) => {
      if (!endpoint || !baseUrl.trim()) return;
      setSending(true);
      setStatusStep("preparing");
      setSendError(null);
      setCorsErrorResult(null);
      setSecurityBlockResult(null);
      setExecutionResult(null);
      setIssues(null);
      setExplanation(null);

      let headers: Record<string, string>;
      try {
        headers = JSON.parse(headersText.trim() || "{}") as Record<string, string>;
        if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
          throw new Error("bad");
        }
      } catch {
        setSendError(t("runApi.badHeaders"));
        setSending(false);
        setStatusStep("blocked");
        return;
      }

      const fullUrl = joinBaseAndPath(baseUrl.trim(), resolvedPath);
      let parsedBodyReq: unknown = undefined;
      if (wantsBody && bodyText.trim()) {
        try {
          parsedBodyReq = JSON.parse(bodyText.trim());
        } catch {
          parsedBodyReq = bodyText.trim();
        }
      }

      const qValuesClean: Record<string, string> = {};
      for (const [k, v] of Object.entries(queryValues)) {
        if (v !== "") qValuesClean[k] = v;
      }

      const reqDef: ApiExecutionRequest = {
        url: fullUrl,
        method: endpoint.method,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        queryParams: Object.keys(qValuesClean).length > 0 ? qValuesClean : undefined,
        body: wantsBody ? parsedBodyReq : undefined,
        auth: {
          type: bearer.trim() || workspaceDefaultBearer.trim()
            ? "bearer"
            : basicUser.trim() || basicPass
              ? "basic"
              : apiKeyValue.trim() && apiKeyName.trim()
                ? "apiKey"
                : "none",
          bearerToken: bearer.trim() || workspaceDefaultBearer.trim() || undefined,
          basicUser: basicUser.trim() || undefined,
          basicPass: basicPass || undefined,
          apiKeyName: apiKeyName.trim() || undefined,
          apiKeyValue: apiKeyValue.trim() || undefined,
          apiKeyIn,
        },
      };

      setStatusStep("validating_target");
      await new Promise((r) => setTimeout(r, 80));
      setStatusStep("executing");

      const result = await executeTestRequestClient(reqDef, modeToUse);
      setExecutionResult(result);

      if (result.success) {
        setStatusStep("receiving");
        setStatus(result.status ?? 200);
        setElapsedMs(result.durationMs ?? 0);
        const rawText = result.rawBody ?? (typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2));
        setResponseText(rawText.slice(0, 48_000));
        setParsedBody(result.body !== undefined ? result.body : null);

        const pairs: [string, string][] = [];
        if (result.headers) {
          for (const [k, v] of Object.entries(result.headers)) {
            pairs.push([k, v]);
          }
        }
        setResponseHeaders(pairs);
        setStatusStep("complete");
      } else {
        setStatus(null);
        setElapsedMs(null);
        setResponseText(null);
        setParsedBody(null);
        setResponseHeaders([]);
        setStatusStep("blocked");

        const code = result.error?.code;
        if (code === "BROWSER_CORS_BLOCKED" || code === "BROWSER_NETWORK_ERROR") {
          setCorsErrorResult(result);
        } else if (
          code === "PRIVATE_NETWORK_BLOCKED" ||
          code === "LOOPBACK_BLOCKED" ||
          code === "METADATA_ENDPOINT_BLOCKED" ||
          code === "PORT_BLOCKED" ||
          code === "UNSUPPORTED_PROTOCOL" ||
          code === "REDIRECT_BLOCKED"
        ) {
          setSecurityBlockResult(result);
        } else {
          setSendError(result.error?.message || t("runApi.sendFailed"));
        }
      }

      setSending(false);
    },
    [
      endpoint,
      baseUrl,
      resolvedPath,
      queryValues,
      headersText,
      wantsBody,
      bodyText,
      bearer,
      workspaceDefaultBearer,
      basicUser,
      basicPass,
      apiKeyName,
      apiKeyValue,
      apiKeyIn,
      t,
    ],
  );

  const onSend = useCallback(async () => {
    await executeWithMode(executionMode);
  }, [executeWithMode, executionMode]);

  const onRunViaProxyClick = useCallback(async () => {
    await executeWithMode("APIFORGE_PROXY");
  }, [executeWithMode]);

  const onValidate = useCallback(async () => {
    if (!endpoint || status == null) return;
    setValLoading(true);
    try {
      const res = await fetch("/api/validate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: endpointToJsonSafe(endpoint),
          statusCode: status,
          body: parsedBody !== null ? parsedBody : responseText,
        }),
      });
      const data = (await res.json()) as {
        issues?: SchemaValidationIssue[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setIssues(data.issues ?? []);
    } catch {
      setIssues(null);
    } finally {
      setValLoading(false);
    }
  }, [endpoint, status, parsedBody, responseText]);

  const responseDisplay = useMemo(() => {
    if (responseText == null) return "";
    if (parsedBody !== null) {
      return typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody, null, 2);
    }
    const trimmed = responseText.trim();
    if (
      (trimmed.startsWith("{") && trimmed.includes("}")) ||
      (trimmed.startsWith("[") && trimmed.includes("]"))
    ) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      } catch {
        return responseText;
      }
    }
    return responseText;
  }, [responseText, parsedBody]);

  const looksLikeJson =
    parsedBody !== null ||
    (responseText?.trim().startsWith("{") ?? false) ||
    (responseText?.trim().startsWith("[") ?? false);

  const onExplain = useCallback(async () => {
    if (!issues?.length || !endpoint || responseText == null) return;
    setExplainLoading(true);
    try {
      const res = await fetch("/api/groq/schema-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issues,
          endpointLine: `${endpoint.method} ${endpoint.path}`,
          responsePreview: responseText.slice(0, 1500),
        }),
      });
      const data = (await res.json()) as { explanation?: string; error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setExplanation(data.explanation ?? null);
      const usage = parseUsageFromResponseHeaders(res.headers);
      if (usage) setLastGroqUsage(usage);
    } catch {
      setExplanation(null);
    } finally {
      setExplainLoading(false);
    }
  }, [issues, endpoint, responseText, setLastGroqUsage]);

  const responseBodyForView = useMemo(() => {
    if (responseText == null) return "";
    if (bodyView === "raw") return responseText;
    if (bodyView === "preview") return responseDisplay;
    return responseDisplay;
  }, [responseText, bodyView, responseDisplay]);

  const onCopyResponse = useCallback(async () => {
    let text = "";
    if (responseTab === "headers") {
      text = responseHeaders.map(([k, v]) => `${k}: ${v}`).join("\n");
    } else if (responseTab === "body") {
      text = responseBodyForView;
    } else {
      text = "";
    }
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      setResponseCopied(true);
      copyResetRef.current = setTimeout(() => {
        setResponseCopied(false);
        copyResetRef.current = null;
      }, 2000);
    } catch {
      /* ignore */
    }
  }, [responseTab, responseHeaders, responseBodyForView]);

  const responseHighlightLang: HighlightLanguage = useMemo(() => {
    if (responseTab !== "body") return "javascript";
    if (looksLikeJson && bodyView !== "raw") return "json";
    return "javascript";
  }, [responseTab, looksLikeJson, bodyView]);

  useEffect(() => {
    setResponseCopied(false);
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }
  }, [responseTab, bodyView, status]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  if (!endpoint) {
    return <p className={styles.placeholder}>{t("workspace.selectEndpoint")}</p>;
  }

  const fullUrlPreview = joinBaseAndPath(
    baseUrl.trim() || "…",
    resolvedPath || endpoint.path,
  );

  const statusOk = status != null && status >= 200 && status < 300;

  return (
    <div className={styles.panel}>
      {/* Execution Mode Selector */}
      <div className={styles.modeSelector}>
        <MaterialIcon name="tune" size="xs" />
        <span className={styles.modeLabel}>{t("runApi.executionModeLabel")}:</span>
        <select
          className={styles.modeSelect}
          value={executionMode}
          onChange={(e) => setExecutionMode(e.target.value as ExecutionMode)}
          aria-label={t("runApi.executionModeLabel")}
        >
          <option value="AUTO">{t("runApi.modeAuto")}</option>
          <option value="BROWSER">{t("runApi.modeBrowser")}</option>
          <option value="APIFORGE_PROXY">{t("runApi.modeProxy")}</option>
        </select>
      </div>

      <details className={styles.acc}>
        <summary className={styles.accSummary}>{t("runApi.workspaceBearerSummary")}</summary>
        <p className={styles.authNote}>{t("runApi.workspaceBearerHint")}</p>
        <label className={styles.miniLabel} htmlFor="workspace-default-bearer">
          {t("runApi.workspaceBearerLabel")}
        </label>
        <input
          id="workspace-default-bearer"
          type="password"
          autoComplete="off"
          className={styles.input}
          value={workspaceDefaultBearer}
          onChange={(e) => setWorkspaceDefaultBearer(e.target.value)}
          placeholder={t("runApi.workspaceBearerPlaceholder")}
        />
      </details>

      <div className={styles.chrome}>
        <div className={styles.chromeInner}>
          <div className={styles.methodPill}>{endpoint.method.toUpperCase()}</div>
          <input
            type="text"
            className={styles.chromeUrl}
            readOnly
            size={1}
            value={fullUrlPreview}
            aria-label={t("runApi.resolvedUrl")}
          />
        </div>
        <button
          type="button"
          className={styles.sendPrimary}
          onClick={() => void onSend()}
          disabled={sending || !baseUrl.trim()}
        >
          <MaterialIcon name="play_arrow" size="sm" />
          {sending ? t("common.loading") : t("runApi.send")}
        </button>
      </div>

      {sending && statusStep !== "idle" ? (
        <div className={styles.statusStepIndicator}>
          <MaterialIcon name="sync" size="xs" className="animate-spin" />
          <span>
            {statusStep === "preparing"
              ? t("runApi.statusSteps.preparing")
              : statusStep === "validating_target"
                ? t("runApi.statusSteps.validating_target")
                : statusStep === "executing"
                  ? t("runApi.statusSteps.executing")
                  : statusStep === "receiving"
                    ? t("runApi.statusSteps.receiving")
                    : t("common.loading")}
          </span>
        </div>
      ) : null}

      {/* CORS Block Alert Banner */}
      {corsErrorResult ? (
        <div className={styles.corsBanner}>
          <h4 className={styles.corsTitle}>
            <MaterialIcon name="shield" size="sm" />
            {t("runApi.corsBlockedTitle")}
          </h4>
          <p className={styles.corsSub}>{t("runApi.corsBlockedSub")}</p>
          <button
            type="button"
            className={styles.proxyCtaBtn}
            onClick={() => void onRunViaProxyClick()}
            disabled={sending}
          >
            <MaterialIcon name="bolt" size="xs" />
            {t("runApi.runViaProxyCta")}
          </button>
        </div>
      ) : null}

      {/* Security Policy Block Alert Banner */}
      {securityBlockResult ? (
        <div className={styles.securityBanner}>
          <h4 className={styles.securityTitle}>
            <MaterialIcon name="gpp_bad" size="sm" />
            {t("runApi.securityBlockedTitle")}
          </h4>
          <p className={styles.securitySub}>
            {securityBlockResult.error?.message}
          </p>
          <span className="text-[10px] font-mono text-neutral-400">
            {t("runApi.requestIdLabel", { id: securityBlockResult.requestId })}
          </span>
        </div>
      ) : null}

      {sendError ? <p className={styles.error}>{sendError}</p> : null}

      {hintLine ? (
        <p className={styles.hintSpec}>{t("runApi.specAuth", { hint: hintLine })}</p>
      ) : (
        <p className={styles.hintSpecMuted}>{t("runApi.noSpecAuth")}</p>
      )}

      <details className={styles.acc}>
        <summary className={styles.accSummary}>{t("runApi.baseUrl")}</summary>
        <input
          id="run-base"
          type="url"
          className={styles.input}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.example.com"
        />
      </details>

      {pathParams.length > 0 ? (
        <details className={styles.acc}>
          <summary className={styles.accSummary}>{t("runApi.pathParams")}</summary>
          {pathParams.map((row) => (
            <div key={row.name} className={styles.fieldRow}>
              <label className={styles.miniLabel} htmlFor={`pp-${row.name}`}>
                {`{${row.name}}`}
              </label>
              <input
                id={`pp-${row.name}`}
                className={styles.input}
                value={pathValues[row.name] ?? ""}
                onChange={(e) =>
                  setPathValues((prev) => ({ ...prev, [row.name]: e.target.value }))
                }
              />
            </div>
          ))}
        </details>
      ) : null}

      {queryParams.length > 0 ? (
        <details className={styles.acc}>
          <summary className={styles.accSummary}>{t("runApi.queryParams")}</summary>
          {queryParams.map((row) => (
            <div key={row.name} className={styles.fieldRow}>
              <label className={styles.miniLabel} htmlFor={`qp-${row.name}`}>
                {row.name}
              </label>
              <input
                id={`qp-${row.name}`}
                className={styles.input}
                value={queryValues[row.name] ?? ""}
                onChange={(e) =>
                  setQueryValues((prev) => ({ ...prev, [row.name]: e.target.value }))
                }
              />
            </div>
          ))}
        </details>
      ) : null}

      <details className={styles.acc}>
        <summary className={styles.accSummary}>{t("runApi.headersJson")}</summary>
        <textarea
          className={styles.textarea}
          rows={4}
          value={headersText}
          onChange={(e) => setHeadersText(e.target.value)}
          spellCheck={false}
          aria-label={t("runApi.headersJson")}
        />
      </details>

      {endpoint.requestBody != null ? (
        <details className={styles.acc}>
          <summary className={styles.accSummary}>{t("runApi.body")}</summary>
          <textarea
            className={styles.textarea}
            rows={8}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            spellCheck={false}
            placeholder="{}"
            aria-label={t("runApi.body")}
          />
        </details>
      ) : null}

      <details className={styles.acc}>
        <summary className={styles.accSummary}>{t("runApi.authManual")}</summary>
        <p className={styles.authNote}>{t("runApi.authNote")}</p>
        <label className={styles.miniLabel} htmlFor="run-bearer">
          Bearer
        </label>
        <input
          id="run-bearer"
          type="password"
          autoComplete="off"
          className={styles.input}
          value={bearer}
          onChange={(e) => setBearer(e.target.value)}
        />
        <div className={styles.twoCol}>
          <div>
            <label className={styles.miniLabel} htmlFor="run-basic-u">
              Basic user
            </label>
            <input
              id="run-basic-u"
              className={styles.input}
              value={basicUser}
              onChange={(e) => setBasicUser(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label className={styles.miniLabel} htmlFor="run-basic-p">
              Basic password
            </label>
            <input
              id="run-basic-p"
              type="password"
              className={styles.input}
              value={basicPass}
              onChange={(e) => setBasicPass(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <div className={styles.apiKeyRow}>
          <div>
            <label className={styles.miniLabel} htmlFor="run-ak-name">
              API key name
            </label>
            <input
              id="run-ak-name"
              className={styles.input}
              value={apiKeyName}
              onChange={(e) => setApiKeyName(e.target.value)}
            />
          </div>
          <div>
            <label className={styles.miniLabel} htmlFor="run-ak-in">
              In
            </label>
            <select
              id="run-ak-in"
              className={styles.select}
              value={apiKeyIn}
              onChange={(e) =>
                setApiKeyIn(e.target.value === "query" ? "query" : "header")
              }
            >
              <option value="header">Header</option>
              <option value="query">Query</option>
            </select>
          </div>
        </div>
        <label className={styles.miniLabel} htmlFor="run-ak-val" style={{ marginTop: 8 }}>
          API key value
        </label>
        <input
          id="run-ak-val"
          type="password"
          className={styles.input}
          value={apiKeyValue}
          onChange={(e) => setApiKeyValue(e.target.value)}
          autoComplete="off"
        />
      </details>

      {/* Response Results Section */}
      {status != null || responseText != null ? (
        <div
          className={`${styles.responseShell} ${responseExpanded ? styles.responseShellExpanded : ""}`}
        >
          <div className={styles.responseHeader}>
            <div className="flex items-center gap-3">
              <span className={styles.sectionHeading}>{t("runApi.responseSection")}</span>
              {status != null ? (
                <span
                  className={`${styles.statusBadge} ${statusOk ? styles.statusBadgeOk : styles.statusBadgeErr}`}
                >
                  {t("runApi.status", { code: status })}
                </span>
              ) : null}
              {executionResult ? (
                <span className={styles.executionPill}>
                  <MaterialIcon
                    name={executionResult.executionMode === "apiforge-proxy" ? "security" : "language"}
                    size="xs"
                  />
                  {executionResult.executionMode === "apiforge-proxy"
                    ? t("runApi.modeProxyShort")
                    : t("runApi.modeBrowserShort")}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={styles.iconGhost}
                onClick={() => void onCopyResponse()}
                title={t("runApi.copyResponse")}
              >
                <MaterialIcon
                  name={responseCopied ? "check" : "content_copy"}
                  size="xs"
                  className={responseCopied ? styles.copyBtnDone : ""}
                />
              </button>
              <button
                type="button"
                className={styles.iconGhost}
                onClick={() => setResponseExpanded((prev) => !prev)}
                title={
                  responseExpanded
                    ? t("runApi.collapse")
                    : t("runApi.expand")
                }
              >
                <MaterialIcon
                  name={responseExpanded ? "fullscreen_exit" : "fullscreen"}
                  size="xs"
                />
              </button>
            </div>
          </div>

          <div className={styles.responseTabs}>
            <button
              type="button"
              className={`${styles.rtab} ${responseTab === "body" ? styles.rtabActive : ""}`}
              onClick={() => setResponseTab("body")}
            >
              {t("runApi.tabBody")}
            </button>
            <button
              type="button"
              className={`${styles.rtab} ${responseTab === "headers" ? styles.rtabActive : ""}`}
              onClick={() => setResponseTab("headers")}
            >
              {t("runApi.tabHeaders", { count: responseHeaders.length })}
            </button>
          </div>

          {responseTab === "body" ? (
            <>
              <div className={styles.subToolbar}>
                <div className={styles.viewToggles}>
                  <button
                    type="button"
                    className={`${styles.viewBtn} ${bodyView === "pretty" ? styles.viewBtnActive : ""}`}
                    onClick={() => setBodyView("pretty")}
                  >
                    {t("runApi.viewPretty")}
                  </button>
                  <button
                    type="button"
                    className={`${styles.viewBtn} ${bodyView === "raw" ? styles.viewBtnActive : ""}`}
                    onClick={() => setBodyView("raw")}
                  >
                    {t("runApi.viewRaw")}
                  </button>
                </div>
                <div className={styles.footerMeta}>
                  {elapsedMs != null ? `${t("runApi.elapsed", { ms: elapsedMs })} · ` : ""}
                  {executionResult?.responseSizeBytes != null
                    ? t("runApi.bytes", { n: executionResult.responseSizeBytes })
                    : ""}
                  {executionResult?.redirectCount
                    ? ` · ${t("runApi.redirectsLabel", { count: executionResult.redirectCount })}`
                    : ""}
                </div>
              </div>

              <div className={styles.responseBodyWrap}>
                <HighlightedCode
                  code={responseBodyForView || "{}"}
                  language={responseHighlightLang}
                  className={styles.responseHl}
                />
              </div>
            </>
          ) : (
            <div className={styles.responseBodyWrap}>
              <pre className={styles.responsePre}>
                {responseHeaders.map(([k, v]) => `${k}: ${v}`).join("\n") || "No headers returned."}
              </pre>
            </div>
          )}

          {/* Validation Actions */}
          <div className={styles.valActions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => void onValidate()}
              disabled={valLoading || status == null}
            >
              <MaterialIcon name="fact_check" size="xs" />
              {valLoading ? t("common.loading") : t("runApi.validate")}
            </button>
            {issues && issues.length > 0 ? (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => void onExplain()}
                disabled={explainLoading}
              >
                <MaterialIcon name="auto_awesome" size="xs" />
                {explainLoading ? t("common.loading") : t("runApi.explain")}
              </button>
            ) : null}
          </div>

          {issues ? (
            issues.length === 0 ? (
              <p className="text-xs text-emerald-500 font-mono">
                ✓ Response matches OpenAPI schema definition.
              </p>
            ) : (
              <ul className={styles.issueList}>
                {issues.map((iss, i) => (
                  <li key={i}>
                    <strong>{iss.path}</strong>: {iss.message}{" "}
                    <span className={styles.issueSev}>({iss.severity})</span>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {explanation ? <div className={styles.explain}>{explanation}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
