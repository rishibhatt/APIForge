"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import HighlightedCode from "@/components/atomic/molecules/HighlightedCode/HighlightedCode";
import type { HighlightLanguage } from "@/components/atomic/molecules/HighlightedCode/HighlightedCode";
import { joinBaseAndPath } from "@/lib/execute-test-request";
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
  const [sendError, setSendError] = useState<string | null>(null);
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

  const onSend = useCallback(async () => {
    if (!endpoint || !baseUrl.trim()) return;
    setSending(true);
    setSendError(null);
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
      return;
    }

    const h = new Headers();
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === "string") h.set(k, v);
    }

    const hasAuth = Object.keys(headers).some(
      (k) => k.toLowerCase() === "authorization",
    );
    if (bearer.trim() && !hasAuth) {
      h.set("Authorization", `Bearer ${bearer.trim()}`);
    } else if (!hasAuth && workspaceDefaultBearer.trim()) {
      h.set("Authorization", `Bearer ${workspaceDefaultBearer.trim()}`);
    } else if (basicUser.trim() || basicPass) {
      const raw = `${basicUser}:${basicPass}`;
      const token = btoa(unescape(encodeURIComponent(raw)));
      if (!hasAuth) h.set("Authorization", `Basic ${token}`);
    }

    if (apiKeyValue.trim() && apiKeyName.trim() && apiKeyIn === "header") {
      const ak = apiKeyName.trim();
      const exists = Object.keys(headers).some(
        (k) => k.toLowerCase() === ak.toLowerCase(),
      );
      if (!exists) h.set(ak, apiKeyValue.trim());
    }

    const u = new URL(joinBaseAndPath(baseUrl.trim(), resolvedPath));
    for (const [k, v] of Object.entries(queryValues)) {
      if (v !== "") u.searchParams.set(k, v);
    }
    if (apiKeyValue.trim() && apiKeyName.trim() && apiKeyIn === "query") {
      u.searchParams.set(apiKeyName.trim(), apiKeyValue.trim());
    }

    let body: string | undefined;
    if (wantsBody) {
      body = bodyText.trim() || "{}";
      const ct = h.get("Content-Type") ?? h.get("content-type");
      if (!ct) h.set("Content-Type", "application/json");
    }

    const t0 = performance.now();
    try {
      const res = await fetch(u.toString(), {
        method: endpoint.method,
        headers: h,
        body: body as BodyInit | undefined,
      });
      const ms = Math.round(performance.now() - t0);
      const text = await res.text();
      const pairs: [string, string][] = [];
      res.headers.forEach((value, key) => {
        pairs.push([key, value]);
      });
      setResponseHeaders(pairs);
      setStatus(res.status);
      setElapsedMs(ms);
      setResponseText(text.slice(0, 48_000));
      try {
        setParsedBody(text ? JSON.parse(text) : null);
      } catch {
        setParsedBody(null);
      }
    } catch (e) {
      setStatus(null);
      setElapsedMs(null);
      setResponseText(null);
      setParsedBody(null);
      setResponseHeaders([]);
      setSendError(
        e instanceof Error
          ? `${e.message} — ${t("testGen.corsHint")}`
          : t("runApi.sendFailed"),
      );
    } finally {
      setSending(false);
    }
  }, [
    endpoint,
    baseUrl,
    resolvedPath,
    queryValues,
    headersText,
    bearer,
    workspaceDefaultBearer,
    basicUser,
    basicPass,
    apiKeyValue,
    apiKeyName,
    apiKeyIn,
    wantsBody,
    bodyText,
    t,
  ]);

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
      return JSON.stringify(parsedBody, null, 2);
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

  const responseBytes = useMemo(() => {
    try {
      return new TextEncoder().encode(responseBodyForView).length;
    } catch {
      return 0;
    }
  }, [responseBodyForView]);

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
              <option value="header">header</option>
              <option value="query">query</option>
            </select>
          </div>
        </div>
        <label className={styles.miniLabel} htmlFor="run-ak-val">
          API key value
        </label>
        <input
          id="run-ak-val"
          type="password"
          autoComplete="off"
          className={styles.input}
          value={apiKeyValue}
          onChange={(e) => setApiKeyValue(e.target.value)}
        />
      </details>

      {sendError ? <p className={styles.error}>{sendError}</p> : null}

      {status != null && elapsedMs != null ? (
        <div
          className={`${styles.responseShell} ${responseExpanded ? styles.responseShellExpanded : ""}`}
        >
          <div className={styles.responseHeader}>
            <h3 className={styles.sectionHeading}>{t("runApi.responseSection")}</h3>
            <span
              className={`${styles.statusBadge} ${statusOk ? styles.statusBadgeOk : styles.statusBadgeErr}`}
            >
              {status}
            </span>
          </div>

          <div className={styles.responseTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={responseTab === "body"}
              className={`${styles.rtab} ${responseTab === "body" ? styles.rtabActive : ""}`}
              onClick={() => setResponseTab("body")}
            >
              {t("runApi.tabBody")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={responseTab === "headers"}
              className={`${styles.rtab} ${responseTab === "headers" ? styles.rtabActive : ""}`}
              onClick={() => setResponseTab("headers")}
            >
              {t("runApi.tabHeaders", { count: responseHeaders.length })}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={responseTab === "tests"}
              className={`${styles.rtab} ${responseTab === "tests" ? styles.rtabActive : ""}`}
              onClick={() => setResponseTab("tests")}
            >
              {t("runApi.tabTests", { count: 0 })}
            </button>
          </div>

          {responseTab === "body" ? (
            <>
              <div className={styles.subToolbar}>
                <div className={styles.viewToggles}>
                  {(["pretty", "raw", "preview"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`${styles.viewBtn} ${bodyView === v ? styles.viewBtnActive : ""}`}
                      onClick={() => setBodyView(v)}
                    >
                      {v === "pretty"
                        ? t("runApi.viewPretty")
                        : v === "raw"
                          ? t("runApi.viewRaw")
                          : t("runApi.viewPreview")}
                    </button>
                  ))}
                </div>
                <label className={styles.formatLabel}>
                  <span className="srOnly">{t("runApi.formatLabel")}</span>
                  <select
                    className={styles.formatSelect}
                    value={looksLikeJson ? "json" : "text"}
                    disabled
                    aria-hidden
                  >
                    <option value="json">{t("runApi.formatJson")}</option>
                    <option value="text">{t("runApi.formatText")}</option>
                  </select>
                </label>
              </div>
              <div className={styles.responseBodyWrap}>
                <HighlightedCode
                  code={bodyView === "raw" ? (responseText ?? "") : responseBodyForView}
                  language={responseHighlightLang}
                  className={styles.responseHl}
                />
              </div>
            </>
          ) : null}

          {responseTab === "headers" ? (
            <div className={styles.responseBodyWrap}>
              <HighlightedCode
                code={
                  responseHeaders.length
                    ? responseHeaders.map(([k, v]) => `${k}: ${v}`).join("\n")
                    : "—"
                }
                language="javascript"
                className={styles.responseHl}
              />
            </div>
          ) : null}

          {responseTab === "tests" ? (
            <div className={styles.testsEmpty}>
              <MaterialIcon name="science" size="md" className={styles.testsIcon} />
              <p className={styles.testsEmptyText}>{t("runApi.testsEmpty")}</p>
              <button type="button" className={styles.addTestBtn} disabled>
                {t("runApi.addTest")}
              </button>
            </div>
          ) : null}

          {responseTab === "body" ? (
            <div className={styles.responseFooter}>
              <span className={styles.footerMeta}>
                {t("runApi.elapsed", { ms: elapsedMs })}
              </span>
              <span className={styles.footerMeta}>
                {t("runApi.bytes", { n: responseBytes })}
              </span>
              <button
                type="button"
                className={`${styles.iconGhost} ${responseCopied ? styles.copyBtnDone : ""}`}
                onClick={() => void onCopyResponse()}
                aria-label={responseCopied ? t("workspace.copied") : t("runApi.copyResponse")}
              >
                <MaterialIcon
                  name={responseCopied ? "check" : "content_copy"}
                  size="sm"
                />
              </button>
              <span className={styles.copyState} aria-live="polite">
                {responseCopied ? t("workspace.copied") : ""}
              </span>
              <button
                type="button"
                className={styles.iconGhost}
                onClick={() => setResponseExpanded((e) => !e)}
                aria-label={
                  responseExpanded ? t("runApi.collapse") : t("runApi.expand")
                }
              >
                <MaterialIcon
                  name={responseExpanded ? "close_fullscreen" : "open_in_full"}
                  size="sm"
                />
              </button>
            </div>
          ) : null}

          {responseTab === "body" ? (
            <div className={styles.valActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => void onValidate()}
                disabled={valLoading}
              >
                {valLoading ? t("common.loading") : t("runApi.validate")}
              </button>
              {issues != null && issues.length > 0 ? (
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => void onExplain()}
                  disabled={explainLoading}
                >
                  {explainLoading ? t("common.loading") : t("runApi.explain")}
                </button>
              ) : null}
            </div>
          ) : null}
          {issues != null && issues.length > 0 && responseTab === "body" ? (
            <ul className={styles.issueList}>
              {issues.map((iss, i) => (
                <li key={`${iss.path}-${i}`}>
                  <strong>{iss.path}</strong> — {iss.message}{" "}
                  <span className={styles.issueSev}>({iss.severity})</span>
                </li>
              ))}
            </ul>
          ) : null}
          {explanation && responseTab === "body" ? (
            <p className={styles.explain}>{explanation}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
