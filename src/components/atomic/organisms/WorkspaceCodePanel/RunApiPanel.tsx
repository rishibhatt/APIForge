"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
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

export default function RunApiPanel({ t }: { t: TranslateFn }) {
  const endpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const specServerUrls = useWorkspaceStore((s) => s.specServerUrls);
  const specSecuritySchemes = useWorkspaceStore((s) => s.specSecuritySchemes);
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

  const [valLoading, setValLoading] = useState(false);
  const [issues, setIssues] = useState<SchemaValidationIssue[] | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

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

  if (!endpoint) {
    return <p className={styles.placeholder}>{t("workspace.selectEndpoint")}</p>;
  }

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{t("runApi.title")}</h2>
          <p className={styles.subtitle}>
            {endpoint.method} {endpoint.path}
          </p>
          {hintLine ? (
            <p className={styles.hintSpec}>{t("runApi.specAuth", { hint: hintLine })}</p>
          ) : (
            <p className={styles.hintSpecMuted}>{t("runApi.noSpecAuth")}</p>
          )}
        </div>
      </header>

      <label className={styles.label} htmlFor="run-base">
        {t("runApi.baseUrl")}
      </label>
      <input
        id="run-base"
        type="url"
        className={styles.input}
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        placeholder="https://api.example.com"
      />

      {pathParams.length > 0 ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("runApi.pathParams")}</h3>
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
        </section>
      ) : null}

      {queryParams.length > 0 ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("runApi.queryParams")}</h3>
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
        </section>
      ) : null}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("runApi.headersJson")}</h3>
        <textarea
          className={styles.textarea}
          rows={4}
          value={headersText}
          onChange={(e) => setHeadersText(e.target.value)}
          spellCheck={false}
          aria-label={t("runApi.headersJson")}
        />
      </section>

      {endpoint.requestBody != null ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("runApi.body")}</h3>
          <textarea
            className={styles.textarea}
            rows={8}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            spellCheck={false}
            placeholder="{}"
            aria-label={t("runApi.body")}
          />
        </section>
      ) : null}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("runApi.authManual")}</h3>
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
      </section>

      <div className={styles.urlPreview}>
        <span className={styles.urlPreviewLabel}>{t("runApi.resolvedUrl")}</span>
        <code className={styles.urlPreviewCode}>
          {joinBaseAndPath(baseUrl.trim() || "…", resolvedPath || endpoint.path)}
          {queryValues &&
          Object.entries(queryValues).some(([, v]) => v !== "")
            ? `?${new URLSearchParams(
                Object.entries(queryValues).filter(([, v]) => v !== ""),
              ).toString()}`
            : ""}
        </code>
      </div>

      <button
        type="button"
        className={styles.sendBtn}
        onClick={() => void onSend()}
        disabled={sending || !baseUrl.trim()}
      >
        <MaterialIcon name="send" size="xs" />
        {sending ? t("common.loading") : t("runApi.send")}
      </button>

      {sendError ? <p className={styles.error}>{sendError}</p> : null}

      {status != null && elapsedMs != null ? (
        <div className={styles.result}>
          <div className={styles.resultMeta}>
            <span className={styles.statusPill}>
              {t("runApi.status", { code: status })}
            </span>
            <span className={styles.timePill}>
              {t("runApi.elapsed", { ms: elapsedMs })}
            </span>
          </div>
          <pre className={styles.responseBody}>{responseText ?? ""}</pre>
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
          {issues != null && issues.length > 0 ? (
            <ul className={styles.issueList}>
              {issues.map((iss, i) => (
                <li key={`${iss.path}-${i}`}>
                  <strong>{iss.path}</strong> — {iss.message}{" "}
                  <span className={styles.issueSev}>({iss.severity})</span>
                </li>
              ))}
            </ul>
          ) : null}
          {explanation ? <p className={styles.explain}>{explanation}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
