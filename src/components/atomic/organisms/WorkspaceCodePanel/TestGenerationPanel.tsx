"use client";

import { useCallback, useMemo, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { getScopedEndpoints, getScopeLabel } from "@/lib/endpoint-groups";
import {
  endpointToJsonSafe,
  endpointsToJsonSafe,
} from "@/lib/serialize-endpoint";
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

export default function TestGenerationPanel({ t }: { t: TranslateFn }) {
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const activeEndpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const generationScope = useWorkspaceStore((s) => s.generationScope);

  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [detail, setDetail] = useState<TestCase | null>(null);

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

  const payloadForApi = useMemo(
    () => ({
      endpoints: endpointsToJsonSafe(scopedForRequest),
      allEndpoints: endpointsToJsonSafe(endpoints),
      active:
        activeEndpoint != null
          ? endpointToJsonSafe(activeEndpoint)
          : endpoints[0] != null
            ? endpointToJsonSafe(endpoints[0])
            : null,
      scope: generationScope,
    }),
    [scopedForRequest, endpoints, activeEndpoint, generationScope],
  );

  const onGenerate = useCallback(async () => {
    if (endpoints.length === 0 || scopedForRequest.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/groq/test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadForApi),
      });

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
    } catch (e) {
      setCases([]);
      setError(e instanceof Error ? e.message : t("testGen.error"));
    } finally {
      setLoading(false);
    }
  }, [endpoints.length, scopedForRequest.length, payloadForApi, t]);

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
