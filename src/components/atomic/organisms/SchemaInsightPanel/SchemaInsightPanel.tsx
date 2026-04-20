"use client";

import { useCallback, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { parseUsageFromResponseHeaders } from "@/lib/groq-token-usage";
import { endpointToJsonSafe } from "@/lib/serialize-endpoint";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Endpoint } from "@/types/api";
import styles from "./SchemaInsightPanel.module.css";

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Flatten top-level schema properties for a compact preview */
function extractBodyFields(requestBody: unknown): { name: string; hint: string }[] {
  if (!isObject(requestBody)) return [];
  const content = requestBody.content;
  if (!isObject(content)) return [];
  const json =
    (content["application/json"] as unknown) ??
    (content["application/*+json"] as unknown);
  if (!isObject(json)) return [];
  const schema = json.schema;
  if (!isObject(schema)) return [];
  const props = schema.properties;
  const required = Array.isArray(schema.required)
    ? (schema.required as string[])
    : [];
  if (!isObject(props)) return [];
  return Object.keys(props).map((name) => {
    const p = props[name];
    const req = required.includes(name);
    let hint = req ? "required" : "optional";
    if (isObject(p)) {
      const t = typeof p.type === "string" ? p.type : "object";
      hint += ` • ${t}`;
    }
    return { name, hint };
  });
}

function extractParamRows(endpoint: Endpoint): { name: string; hint: string }[] {
  const p = endpoint.parameters;
  if (!Array.isArray(p)) return [];
  return p
    .map((item) => {
      if (!isObject(item)) return null;
      const name = typeof item.name === "string" ? item.name : "?";
      const inn = typeof item.in === "string" ? item.in : "";
      const req = item.required === true;
      let hint = [inn, req ? "required" : "optional"].filter(Boolean).join(" • ");
      const schema = item.schema;
      if (isObject(schema) && typeof schema.type === "string") {
        hint += ` • ${schema.type}`;
      }
      return { name, hint };
    })
    .filter((x): x is { name: string; hint: string } => x !== null);
}

interface SchemaInsightPanelProps {
  t: TranslateFn;
  endpoint: Endpoint;
}

export default function SchemaInsightPanel({
  t,
  endpoint,
}: SchemaInsightPanelProps) {
  const setLastGroqUsage = useWorkspaceStore((s) => s.setLastGroqUsage);
  const setLastGenerationMs = useWorkspaceStore((s) => s.setLastGenerationMs);
  const [nlPrompt, setNlPrompt] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [nlOutput, setNlOutput] = useState<string | null>(null);

  const bodyFields = extractBodyFields(endpoint.requestBody);
  const paramRows = extractParamRows(endpoint);

  const onGeneratePayload = useCallback(async () => {
    const instruction = nlPrompt.trim();
    if (!instruction) return;
    setNlLoading(true);
    setNlError(null);
    setNlOutput(null);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/groq/payload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: endpointToJsonSafe(endpoint),
          instruction,
        }),
      });
      const usage = parseUsageFromResponseHeaders(res.headers);
      const data = (await res.json()) as {
        payload?: unknown;
        error?: string;
        rawPreview?: string;
      };
      if (!res.ok) {
        throw new Error(
          data.error ||
            data.rawPreview ||
            `HTTP ${res.status}`,
        );
      }
      setNlOutput(JSON.stringify(data.payload, null, 2));
      setLastGenerationMs(Math.round(performance.now() - t0));
      if (usage) setLastGroqUsage(usage);
    } catch (e) {
      setNlError(e instanceof Error ? e.message : t("schemaInsight.payloadError"));
      setLastGroqUsage(null);
    } finally {
      setNlLoading(false);
    }
  }, [
    endpoint,
    nlPrompt,
    setLastGroqUsage,
    setLastGenerationMs,
    t,
  ]);

  const onCopyPayload = useCallback(async () => {
    if (!nlOutput) return;
    try {
      await navigator.clipboard.writeText(nlOutput);
    } catch {
      /* ignore */
    }
  }, [nlOutput]);

  return (
    <aside className={styles.wrap} aria-label={t("schemaInsight.aria")}>
      {paramRows.length > 0 ? (
        <section>
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
      <section>
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

      <section>
        <h3 className={styles.sectionTitle}>{t("schemaInsight.payloadTitle")}</h3>
        <p className={styles.hintBlock}>{t("schemaInsight.payloadHint")}</p>
        <textarea
          className={styles.nlArea}
          rows={3}
          value={nlPrompt}
          onChange={(e) => setNlPrompt(e.target.value)}
          placeholder={t("schemaInsight.payloadPlaceholder")}
          disabled={nlLoading}
          aria-label={t("schemaInsight.payloadPlaceholder")}
        />
        <div className={styles.payloadActions}>
          <button
            type="button"
            className={styles.payloadBtn}
            onClick={() => void onGeneratePayload()}
            disabled={nlLoading || !nlPrompt.trim()}
          >
            <MaterialIcon name="auto_awesome" size="xs" />
            {nlLoading ? t("common.loading") : t("schemaInsight.generatePayload")}
          </button>
          {nlOutput ? (
            <button
              type="button"
              className={styles.payloadBtnGhost}
              onClick={() => void onCopyPayload()}
            >
              <MaterialIcon name="content_copy" size="xs" />
              {t("schemaInsight.payloadCopy")}
            </button>
          ) : null}
        </div>
        {nlError ? <p className={styles.nlError}>{nlError}</p> : null}
        {nlOutput ? <pre className={styles.nlPre}>{nlOutput}</pre> : null}
      </section>
    </aside>
  );
}
