"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import MethodBadge from "@/components/atomic/atoms/MethodBadge/MethodBadge";
import type { Endpoint } from "@/types/api";
import styles from "./EndpointStrip.module.css";

function countParams(ep: Endpoint): number {
  const p = ep.parameters;
  if (!Array.isArray(p)) return 0;
  return p.length;
}

function countResponses(ep: Endpoint): number {
  const r = ep.responses;
  if (!r || typeof r !== "object") return 0;
  return Object.keys(r as object).length;
}

interface EndpointStripProps {
  t: TranslateFn;
  endpoint: Endpoint;
}

export default function EndpointStrip({ t, endpoint }: EndpointStripProps) {
  const tag = endpoint.tags?.[0]?.trim();
  const nParams = countParams(endpoint);
  const nRes = countResponses(endpoint);

  return (
    <div className={styles.strip}>
      <div className={styles.row}>
        <MethodBadge method={endpoint.method} />
        <h1 className={styles.path}>{endpoint.path}</h1>
      </div>
      <div className={styles.meta}>
        {endpoint.summary ? (
          <p className={styles.summary}>{endpoint.summary}</p>
        ) : null}
        {tag ? (
          <span className={styles.tagPill}>
            <MaterialIcon name="tag" size="xs" />
            {tag}
          </span>
        ) : null}
        <div className={styles.counts}>
          <span>
            <strong>{nParams}</strong> {t("endpointStrip.params")}
          </span>
          <span>
            <strong>{nRes}</strong> {t("endpointStrip.responses")}
          </span>
        </div>
      </div>
    </div>
  );
}
