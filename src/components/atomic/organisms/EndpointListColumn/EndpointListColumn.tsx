"use client";

import { useMemo } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import { groupEndpointsByTag } from "@/lib/extract-endpoints";
import { useFilteredEndpoints } from "@/hooks/useFilteredEndpoints";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Endpoint } from "@/types/api";
import styles from "./EndpointListColumn.module.css";

function firstMapKey<K, V>(m: Map<K, V>): K | undefined {
  return m.keys().next().value;
}

function methodPillClass(method: string): string {
  const m = method.toUpperCase();
  if (m === "GET") return styles.pillGet;
  if (m === "POST") return styles.pillPost;
  if (m === "DELETE") return styles.pillDelete;
  if (m === "PUT" || m === "PATCH") return styles.pillPut;
  return styles.pillDefault;
}

function cardTitle(ep: Endpoint): string {
  const s = ep.summary?.trim();
  if (s) {
    const first = s.split(/[.!?]/)[0]?.trim();
    return first && first.length > 0 ? first : s;
  }
  const parts = ep.path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? ep.path;
}

function pathShort(ep: Endpoint): string {
  const p = ep.path.replace(/^\//, "");
  return p.length > 48 ? `…${p.slice(-44)}` : p;
}

export interface EndpointListColumnProps {
  t: TranslateFn;
}

export default function EndpointListColumn({ t }: EndpointListColumnProps) {
  const activeEndpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const setActiveEndpoint = useWorkspaceStore((s) => s.setActiveEndpoint);
  const selectedCollectionTag = useWorkspaceStore(
    (s) => s.selectedCollectionTag,
  );

  const filtered = useFilteredEndpoints();
  const grouped = useMemo(() => groupEndpointsByTag(filtered), [filtered]);

  const resolvedTag = useMemo(() => {
    if (selectedCollectionTag && grouped.has(selectedCollectionTag)) {
      return selectedCollectionTag;
    }
    const first = firstMapKey(grouped);
    return typeof first === "string" ? first : null;
  }, [grouped, selectedCollectionTag]);

  const listEps = useMemo(() => {
    if (!resolvedTag) return [];
    return grouped.get(resolvedTag) ?? [];
  }, [grouped, resolvedTag]);

  return (
    <section
      className={styles.column}
      aria-label={t("workspace.endpointListAria")}
    >
      <div className={styles.head}>
        <h2 className={styles.collectionTitle}>
          {resolvedTag ?? t("workspace.collectionUntitled")}
        </h2>
        <p className={styles.collectionMeta}>
          {t("workspace.collectionMeta", { count: listEps.length })}
        </p>
      </div>

      <div className={styles.scroll}>
        {listEps.length === 0 ? (
          <p className={styles.empty}>{t("sidebar.noMatchingEndpoints")}</p>
        ) : (
          listEps.map((ep: Endpoint) => {
            const active = activeEndpoint?.id === ep.id;
            return (
              <button
                key={ep.id}
                type="button"
                className={`${styles.card} ${active ? styles.cardActive : ""}`}
                onClick={() => setActiveEndpoint(ep)}
              >
                <div className={styles.cardTop}>
                  <span
                    className={`${styles.methodPill} ${methodPillClass(ep.method)}`}
                  >
                    {ep.method.toUpperCase()}
                  </span>
                  <span className={styles.pathTiny}>{pathShort(ep)}</span>
                </div>
                <h3 className={styles.cardHeading}>{cardTitle(ep)}</h3>
                {ep.summary?.trim() ? (
                  <p className={styles.summary}>{ep.summary.trim()}</p>
                ) : (
                  <p className={styles.summaryMuted}>{t("workspace.noSummary")}</p>
                )}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
