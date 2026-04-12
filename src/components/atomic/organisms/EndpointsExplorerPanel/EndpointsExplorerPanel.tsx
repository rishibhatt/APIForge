"use client";

import { useMemo } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MethodBadge from "@/components/atomic/atoms/MethodBadge/MethodBadge";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { groupEndpointsByTag } from "@/lib/extract-endpoints";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Endpoint } from "@/types/api";
import styles from "./EndpointsExplorerPanel.module.css";

interface EndpointsExplorerPanelProps {
  t: TranslateFn;
}

export default function EndpointsExplorerPanel({ t }: EndpointsExplorerPanelProps) {
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const activeEndpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const setActive = useWorkspaceStore((s) => s.setActiveEndpoint);

  const grouped = useMemo(() => groupEndpointsByTag(endpoints), [endpoints]);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.heading}>{t("workspace.endpointsHeading")}</h2>
        <span className={styles.badge}>
          {t("workspace.sensorsBadge", { count: endpoints.length })}
        </span>
      </div>
      <div className={styles.list}>
        {endpoints.length === 0 ? (
          <p className={styles.empty}>{t("sidebar.emptyEndpoints")}</p>
        ) : (
          Array.from(grouped.entries()).map(([tag, eps]) => (
            <div key={tag} className={styles.group}>
              <div className={styles.groupHead}>
                <MaterialIcon name="expand_more" size="xs" />
                <span className={styles.groupTitle}>{tag}</span>
              </div>
              <div className={styles.inner}>
                {eps.map((ep: Endpoint) => {
                  const active = activeEndpoint?.id === ep.id;
                  return (
                    <button
                      key={`${tag}-${ep.id}`}
                      type="button"
                      className={`${styles.row} focusRing ${active ? styles.rowActive : ""}`}
                      onClick={() => setActive(ep)}
                    >
                      <div className={styles.rowInner}>
                        <MethodBadge method={ep.method} />
                        <span className={active ? styles.path : styles.pathMuted}>
                          {ep.path}
                        </span>
                      </div>
                      <MaterialIcon
                        name="arrow_forward"
                        size="sm"
                        className={styles.arrow}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
