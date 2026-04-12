"use client";

import type { TranslateFn } from "@/context/LanguageContext";
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
  const bodyFields = extractBodyFields(endpoint.requestBody);
  const paramRows = extractParamRows(endpoint);

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
    </aside>
  );
}
