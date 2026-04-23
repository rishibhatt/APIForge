"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { getScopedEndpoints, getScopeLabel } from "@/lib/endpoint-groups";
import {
  joinBaseAndPath,
  prepareRequestFromPayload,
  statusExpectationMet,
} from "@/lib/execute-test-request";
import { parseUsageFromResponseHeaders } from "@/lib/groq-token-usage";
import {
  endpointToJsonSafe,
  endpointsToJsonSafe,
} from "@/lib/serialize-endpoint";
import type { SchemaValidationIssue } from "@/lib/validate-response-against-schema";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { TestCase } from "@/types/api";
import styles from "./TestGenerationPanel.module.css";

const API_TEST_SCOPE_THRESHOLD = 10;
const API_TEST_SCOPE_LIMIT = 10;

function statusBadge(expected: number): { text: string; cls: string } {
  if (expected >= 200 && expected < 300) {
    return { text: `${expected} OK`, cls: styles.badgeOk };
  }
  if (expected === 401 || expected === 403) {
    return { text: `${expected}`, cls: styles.badgeAuth };
  }
  if (expected === 400 || expected === 422) {
    return { text: `${expected} BAD REQUEST`, cls: styles.badgeWarn };
  }
  if (expected === 429) {
    return { text: `${expected} TOO MANY`, cls: styles.badgeRate };
  }
  if (expected >= 500) {
    return { text: `${expected}`, cls: styles.badgeBad };
  }
  return { text: `${expected}`, cls: styles.badgeNeutral };
}

function scenarioLabel(type: TestCase["type"]): string {
  if (type === "valid") return "POSITIVE";
  if (type === "invalid") return "NEGATIVE";
  return "EDGE";
}

function scenarioClass(type: TestCase["type"]): string {
  if (type === "valid") return styles.scenarioPos;
  if (type === "invalid") return styles.scenarioNeg;
  return styles.scenarioEdge;
}

type RunResult = {
  status: number;
  ms: number;
  bodyText: string;
  parsedBody: unknown;
  pass: boolean;
};

export default function TestGenerationPanel({ t }: { t: TranslateFn }) {
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const activeEndpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const generationScope = useWorkspaceStore((s) => s.generationScope);
  const specServerUrls = useWorkspaceStore((s) => s.specServerUrls);
  const setLastGroqUsage = useWorkspaceStore((s) => s.setLastGroqUsage);
  const setLastGenerationMs = useWorkspaceStore((s) => s.setLastGenerationMs);

  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [detail, setDetail] = useState<TestCase | null>(null);
  const [userInstruction, setUserInstruction] = useState("");
  const [lastGenMs, setLastGenMs] = useState<number | null>(null);
  const [lastGenTokens, setLastGenTokens] = useState<number | null>(null);

  const [baseUrl, setBaseUrl] = useState("");
  const [bearer, setBearer] = useState("");
  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [valLoading, setValLoading] = useState(false);
  const [validationIssues, setValidationIssues] = useState<
    SchemaValidationIssue[] | null
  >(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const rawScoped = useMemo(
    () => getScopedEndpoints(endpoints, activeEndpoint, generationScope),
    [endpoints, activeEndpoint, generationScope],
  );

  const { scopedForRequest, apiScopeLimited, totalBeforeLimit } = useMemo(() => {
    if (
      generationScope !== "api" ||
      rawScoped.length <= API_TEST_SCOPE_THRESHOLD
    ) {
      return {
        scopedForRequest: rawScoped,
        apiScopeLimited: false,
        totalBeforeLimit: rawScoped.length,
      };
    }
    return {
      scopedForRequest: rawScoped.slice(0, API_TEST_SCOPE_LIMIT),
      apiScopeLimited: true,
      totalBeforeLimit: rawScoped.length,
    };
  }, [generationScope, rawScoped]);

  const heading = useMemo(
    () =>
      getScopeLabel(
        endpoints,
        activeEndpoint,
        generationScope,
        scopedForRequest,
      ),
    [endpoints, activeEndpoint, generationScope, scopedForRequest],
  );

  const curlEndpoint = activeEndpoint ?? scopedForRequest[0] ?? null;

  const payloadForApi = useMemo(() => {
    const trimmed = userInstruction.trim();
    return {
      endpoints: endpointsToJsonSafe(scopedForRequest),
      allEndpoints: endpointsToJsonSafe(endpoints),
      active:
        activeEndpoint != null
          ? endpointToJsonSafe(activeEndpoint)
          : endpoints[0] != null
            ? endpointToJsonSafe(endpoints[0])
            : null,
      scope: generationScope,
      ...(trimmed ? { userInstruction: trimmed } : {}),
    };
  }, [
    scopedForRequest,
    endpoints,
    activeEndpoint,
    generationScope,
    userInstruction,
  ]);

  useEffect(() => {
    if (!detail?.id) return;
    setRunResult(null);
    setValidationIssues(null);
    setExplanation(null);
    const first = specServerUrls[0]?.trim() ?? "";
    setBaseUrl((prev) => (prev.trim() ? prev : first));
  }, [detail?.id, specServerUrls]);

  const onGenerate = useCallback(async () => {
    if (endpoints.length === 0 || scopedForRequest.length === 0) return;
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/groq/test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadForApi),
      });

      const usage = parseUsageFromResponseHeaders(res.headers);
      const text = await res.text();
      let data: { testCases?: TestCase[]; error?: string };
      try {
        data = JSON.parse(text) as { testCases?: TestCase[]; error?: string };
      } catch {
        throw new Error(
          res.ok
            ? t("testGen.invalidResponse")
            : `HTTP ${res.status}: ${text.slice(0, 120)}`,
        );
      }

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (!data.testCases?.length) {
        throw new Error(t("testGen.noCasesReturned"));
      }
      setCases(data.testCases);
      const ms = Math.round(performance.now() - t0);
      setLastGenMs(ms);
      setLastGenerationMs(ms);
      const tok = usage?.totalTokens ?? null;
      setLastGenTokens(tok);
      setLastGroqUsage(usage);
    } catch (e) {
      setCases([]);
      setError(e instanceof Error ? e.message : t("testGen.error"));
      setLastGenMs(null);
      setLastGenTokens(null);
      setLastGroqUsage(null);
    } finally {
      setLoading(false);
    }
  }, [
    endpoints.length,
    scopedForRequest.length,
    payloadForApi,
    t,
    setLastGroqUsage,
    setLastGenerationMs,
  ]);

  const onRunTest = useCallback(async () => {
    if (!detail || !curlEndpoint || !baseUrl.trim()) return;
    setRunLoading(true);
    setValidationIssues(null);
    setExplanation(null);
    try {
      const { urlPath, query, body, hasJsonBody } = prepareRequestFromPayload(
        curlEndpoint,
        detail.payload,
      );
      const u = new URL(joinBaseAndPath(baseUrl.trim(), urlPath));
      query.forEach((value, key) => {
        u.searchParams.append(key, value);
      });
      const headers: Record<string, string> = {};
      if (hasJsonBody) headers["Content-Type"] = "application/json";
      const token = bearer.trim();
      if (token) headers.Authorization = `Bearer ${token}`;

      const t0 = performance.now();
      const res = await fetch(u.toString(), {
        method: curlEndpoint.method,
        headers,
        body: body as BodyInit | undefined,
      });
      const ms = Math.round(performance.now() - t0);
      const text = await res.text();
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      const pass = statusExpectationMet(
        res.status,
        detail.expectedStatus,
        detail.type,
      );
      setRunResult({
        status: res.status,
        ms,
        bodyText: text.slice(0, 12_000),
        parsedBody: parsed,
        pass,
      });
    } catch (e) {
      setRunResult({
        status: 0,
        ms: 0,
        bodyText:
          e instanceof Error
            ? `${e.message}\n\n${t("testGen.corsHint")}`
            : t("testGen.runError"),
        parsedBody: null,
        pass: false,
      });
    } finally {
      setRunLoading(false);
    }
  }, [detail, curlEndpoint, baseUrl, bearer, t]);

  const onValidateResponse = useCallback(async () => {
    if (!runResult || !curlEndpoint || runResult.status === 0) return;
    setValLoading(true);
    try {
      const bodyPayload =
        runResult.parsedBody !== null
          ? runResult.parsedBody
          : runResult.bodyText;
      const res = await fetch("/api/validate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: endpointToJsonSafe(curlEndpoint),
          statusCode: runResult.status,
          body: bodyPayload,
        }),
      });
      const data = (await res.json()) as {
        issues?: SchemaValidationIssue[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setValidationIssues(data.issues ?? []);
    } catch {
      setValidationIssues(null);
    } finally {
      setValLoading(false);
    }
  }, [runResult, curlEndpoint]);

  const onExplainIssues = useCallback(async () => {
    if (!validationIssues?.length || !runResult || !curlEndpoint) return;
    setExplainLoading(true);
    try {
      const res = await fetch("/api/groq/schema-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issues: validationIssues,
          endpointLine: `${curlEndpoint.method} ${curlEndpoint.path}`,
          responsePreview: runResult.bodyText.slice(0, 1500),
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
  }, [validationIssues, runResult, curlEndpoint, setLastGroqUsage]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q),
    );
  }, [cases, filter]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(cases, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "apiforge-test-cases.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [cases]);

  const exportCurl = useCallback(() => {
    if (!curlEndpoint) return;
    const sample = cases[0];
    const body =
      sample && typeof sample.payload === "object"
        ? JSON.stringify(sample.payload)
        : "{}";
    const curl = `curl -X ${curlEndpoint.method} '${curlEndpoint.path.startsWith("/") ? `https://api.example.com${curlEndpoint.path}` : curlEndpoint.path}' \\
  -H 'Content-Type: application/json' \\
  -d '${body.replace(/'/g, "'\\''")}'`;
    void navigator.clipboard.writeText(curl);
  }, [curlEndpoint, cases]);

  const exportPostman = useCallback(() => {
    const ep = curlEndpoint;
    const collection = {
      info: {
        name: "ApiForge tests",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: cases.map((c) => ({
        name: c.id,
        request: {
          method: ep?.method || "GET",
          header: [{ key: "Content-Type", value: "application/json" }],
          body: { mode: "raw", raw: JSON.stringify(c.payload, null, 2) },
          url: { raw: ep?.path || "/" },
        },
      })),
    };
    const blob = new Blob([JSON.stringify(collection, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "apiforge-postman.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [cases, curlEndpoint]);

  if (endpoints.length === 0) {
    return <p className={styles.placeholder}>{t("workspace.selectEndpoint")}</p>;
  }

  if (rawScoped.length === 0) {
    return <p className={styles.placeholder}>{t("workspace.scopedEmpty")}</p>;
  }

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>{t("testGen.scenariosTitle")}</h2>
          <p className={styles.subtitle}>
            {t("testGen.scopeLabel")}: {heading}
          </p>
          {apiScopeLimited ? (
            <p className={styles.scopeLimitNote}>
              {t("testGen.apiScopeLimitWarning", {
                total: totalBeforeLimit,
                limit: API_TEST_SCOPE_LIMIT,
              })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.generateCta}
          onClick={() => void onGenerate()}
          disabled={loading}
        >
          <MaterialIcon name="auto_awesome" size="xs" />
          {loading ? t("common.loading") : t("testGen.generate")}
        </button>
      </header>

      <div className={styles.instructionBlock}>
        <label className={styles.instructionLabel} htmlFor="test-gen-instruction">
          {t("testGen.instructionsLabel")}
        </label>
        <textarea
          id="test-gen-instruction"
          className={styles.instructionArea}
          rows={2}
          value={userInstruction}
          onChange={(e) => setUserInstruction(e.target.value)}
          placeholder={t("testGen.instructionsPlaceholder")}
          disabled={loading}
        />
      </div>
      {lastGenMs != null ? (
        <p className={styles.genMetrics}>
          {t("testGen.genMetrics", {
            ms: lastGenMs,
            tokens: lastGenTokens ?? "—",
          })}
        </p>
      ) : null}

      <div className={styles.filterRow}>
        <MaterialIcon name="search" size="xs" className={styles.filterIcon} decorative />
        <input
          type="search"
          className={styles.filter}
          placeholder={t("testGen.filterPlaceholder")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          disabled={cases.length === 0}
          aria-label={t("testGen.filterPlaceholder")}
        />
      </div>

      {loading && cases.length === 0 ? (
        <p className={styles.placeholder}>{t("testGen.loading")}</p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {cases.length > 0 ? (
        <ul className={styles.cardList}>
          {filtered.map((row, index) => {
            const badge = statusBadge(row.expectedStatus);
            const idx = String(index + 1).padStart(2, "0");
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={styles.card}
                  onClick={() => setDetail(row)}
                >
                  <div className={styles.cardTop}>
                    <span className={`${styles.scenario} ${scenarioClass(row.type)}`}>
                      {idx} | {scenarioLabel(row.type)}
                    </span>
                    <span className={`${styles.statusBadge} ${badge.cls}`}>{badge.text}</span>
                  </div>
                  <p className={styles.cardTitle}>{row.description}</p>
                  <pre className={styles.cardPayload}>
                    {formatPayloadPreview(row.payload)}
                  </pre>
                  <span className={styles.cardHint}>{t("testGen.tapForDetail")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {cases.length > 0 ? (
        <div className={styles.exportRow}>
          <button type="button" className={styles.btnGhost} onClick={exportJson}>
            {t("testGen.exportJson")}
          </button>
          <button type="button" className={styles.btnGhost} onClick={exportCurl}>
            {t("testGen.exportCurl")}
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => {
              const ep = curlEndpoint;
              const js = cases
                .map(
                  (c) =>
                    `// ${c.id}\nawait fetch(url, { method: '${ep?.method ?? "GET"}', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(${JSON.stringify(c.payload)}) });`,
                )
                .join("\n\n");
              void navigator.clipboard.writeText(js);
            }}
          >
            {t("testGen.exportJs")}
          </button>
          <button type="button" className={styles.btnGhost} onClick={exportPostman}>
            {t("testGen.exportPostman")}
          </button>
        </div>
      ) : null}

      {detail ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => setDetail(null)}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="test-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 id="test-detail-title" className={styles.modalTitle}>
                {detail.id} — {detail.description}
              </h3>
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.modalClose}`}
                onClick={() => setDetail(null)}
                aria-label={t("testGen.closeDetail")}
              >
                <MaterialIcon name="close" size="sm" />
              </button>
            </div>
            <p className={styles.reason}>{detail.reason}</p>

            <div className={styles.modalRun}>
              <p className={styles.modalRunTitle}>{t("testGen.runTitle")}</p>
              <label className={styles.inputLabel} htmlFor="test-base-url">
                {t("testGen.baseUrl")}
              </label>
              <input
                id="test-base-url"
                type="url"
                className={styles.textInput}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
              />
              <label className={styles.inputLabel} htmlFor="test-bearer">
                {t("testGen.bearer")}
              </label>
              <input
                id="test-bearer"
                type="password"
                autoComplete="off"
                className={styles.textInput}
                value={bearer}
                onChange={(e) => setBearer(e.target.value)}
                placeholder={t("testGen.bearerPlaceholder")}
              />
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.miniPrimary}
                  onClick={() => void onRunTest()}
                  disabled={runLoading || !baseUrl.trim()}
                >
                  <MaterialIcon name="play_arrow" size="xs" />
                  {runLoading ? t("common.loading") : t("testGen.runTest")}
                </button>
                {runResult ? (
                  <>
                    <button
                      type="button"
                      className={styles.miniGhost}
                      onClick={() => void onValidateResponse()}
                      disabled={valLoading || runResult.status === 0}
                    >
                      {valLoading ? t("common.loading") : t("testGen.validateSchema")}
                    </button>
                    {validationIssues?.length ? (
                      <button
                        type="button"
                        className={styles.miniGhost}
                        onClick={() => void onExplainIssues()}
                        disabled={explainLoading}
                      >
                        {explainLoading
                          ? t("common.loading")
                          : t("testGen.explainAI")}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
              {runResult ? (
                <div
                  className={`${styles.runOutcome} ${runResult.pass ? styles.runPass : styles.runFail}`}
                >
                  <span className={styles.runOutcomeMain}>
                    {runResult.pass ? t("testGen.runPass") : t("testGen.runFail")}{" "}
                    · HTTP {runResult.status} · {runResult.ms}ms
                  </span>
                  <pre className={styles.runBody}>{runResult.bodyText}</pre>
                </div>
              ) : null}
              {validationIssues?.length ? (
                <ul className={styles.issueList}>
                  {validationIssues.map((iss, i) => (
                    <li key={`${iss.path}-${i}`}>
                      <strong>{iss.path}</strong> — {iss.message}{" "}
                      <span className={styles.issueSev}>({iss.severity})</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {explanation ? (
                <p className={styles.explainBox}>{explanation}</p>
              ) : null}
              <p className={styles.corsNote}>{t("testGen.corsHint")}</p>
            </div>

            <pre className={styles.modalPre}>{JSON.stringify(detail.payload, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatPayloadPreview(payload: unknown): string {
  try {
    const s = JSON.stringify(payload, null, 2);
    const max = 320;
    if (s.length <= max) return s;
    return `${s.slice(0, max)}…`;
  } catch {
    return String(payload);
  }
}
