"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import MethodBadge from "@/components/atomic/atoms/MethodBadge/MethodBadge";
import { groupEndpointsByTag } from "@/lib/extract-endpoints";
import { useFilteredEndpoints } from "@/hooks/useFilteredEndpoints";
import {
  HTTP_METHODS_FILTER,
  useWorkspaceStore,
  type MethodFilterKey,
} from "@/store/workspaceStore";
import type { Endpoint } from "@/types/api";
import styles from "./WorkspaceSidebar.module.css";

function chipClass(
  base: string,
  m: MethodFilterKey,
  active: boolean,
): string {
  const map: Record<MethodFilterKey, string> = {
    GET: styles.chipGet,
    POST: styles.chipPost,
    PUT: styles.chipPut,
    PATCH: styles.chipPatch,
    DELETE: styles.chipDelete,
    HEAD: styles.chipPost,
    OPTIONS: styles.chipPost,
  };
  return `${base} ${map[m] ?? ""} ${active ? styles.chipActive : ""}`.trim();
}

interface WorkspaceSidebarProps {
  t: TranslateFn;
  hasWorkspace: boolean;
}

export default function WorkspaceSidebar({
  t,
  hasWorkspace,
}: WorkspaceSidebarProps) {
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const specTitle = useWorkspaceStore((s) => s.specTitle);
  const specVersion = useWorkspaceStore((s) => s.specVersion);
  const activeEndpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const setActive = useWorkspaceStore((s) => s.setActiveEndpoint);
  const endpointSearch = useWorkspaceStore((s) => s.endpointSearch);
  const setEndpointSearch = useWorkspaceStore((s) => s.setEndpointSearch);
  const methodFilters = useWorkspaceStore((s) => s.methodFilters);
  const toggleMethodFilter = useWorkspaceStore((s) => s.toggleMethodFilter);
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);
  const mobileOpen = useWorkspaceStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useWorkspaceStore((s) => s.setMobileSidebarOpen);

  const filtered = useFilteredEndpoints();
  const grouped = useMemo(() => groupEndpointsByTag(filtered), [filtered]);

  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleGroup = useCallback((tag: string) => {
    setCollapsedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!hasWorkspace) setCollapsedTags(new Set());
  }, [hasWorkspace]);

  const titleDisplay =
    specTitle && specTitle.trim().length > 0
      ? specTitle
      : t("sidebar.noSpecTitle");

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label={t("a11y.closeExplorer")}
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={`${styles.aside} ${mobileOpen ? styles.open : ""} ${!hasWorkspace ? styles.asideHiddenDesktop : ""}`}
        aria-label={t("sidebar.apiExplorer")}
      >
        <div className={styles.head}>
          <div className={styles.headTop}>
            <div className={styles.iconWrap}>
              <MaterialIcon name="account_tree" size="sm" />
            </div>
            <div>
              <h2 className={styles.title}>{titleDisplay}</h2>
              <p className={styles.version}>
                {specVersion
                  ? t("sidebar.specVersion", { version: specVersion })
                  : t("sidebar.specIdle")}
              </p>
            </div>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>
              {hasWorkspace ? t("sidebar.statusParsed") : t("sidebar.statusIdle")}
            </span>
            <span className={styles.statusCount}>
              {t("sidebar.endpointCount", { count: endpoints.length })}
            </span>
          </div>
        </div>

        {hasWorkspace ? (
          <div className={styles.filtersPanel}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>
                <MaterialIcon name="search" size="sm" />
              </span>
              <input
                type="search"
                className={styles.searchInput}
                placeholder={t("sidebar.searchEndpoints")}
                value={endpointSearch}
                onChange={(e) => setEndpointSearch(e.target.value)}
                aria-label={t("sidebar.searchEndpoints")}
              />
            </div>
            <div className={styles.chips} role="group" aria-label={t("sidebar.methodFilters")}>
              {HTTP_METHODS_FILTER.map((m) => {
                const active = methodFilters.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    className={chipClass(styles.chip, m, active)}
                    onClick={() => toggleMethodFilter(m)}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className={styles.scroll}>
          <div className={styles.list}>
            {!hasWorkspace ? (
              <p className={styles.empty}>{t("sidebar.emptyEndpoints")}</p>
            ) : filtered.length === 0 ? (
              <p className={styles.empty}>
                {t("sidebar.noMatchingEndpoints")}
                <br />
                <span className={styles.emptyHint}>
                  {t("sidebar.adjustFilters")}
                </span>
              </p>
            ) : (
              Array.from(grouped.entries()).map(([tag, eps], idx) => {
                const collapsed = collapsedTags.has(tag);
                const gid = `ep-group-${idx}`;
                return (
                  <div key={tag} className={styles.group}>
                    <button
                      type="button"
                      className={`${styles.groupHead} focusRing`}
                      aria-expanded={!collapsed}
                      aria-controls={gid}
                      id={`${gid}-head`}
                      onClick={() => toggleGroup(tag)}
                    >
                      <span
                        className={`${styles.groupChevron} ${collapsed ? styles.groupChevronCollapsed : ""}`}
                        aria-hidden
                      >
                        <MaterialIcon name="expand_more" size="xs" />
                      </span>
                      <span className={styles.groupTitle}>{tag}</span>
                      <span className={styles.groupCount}>{eps.length}</span>
                    </button>
                    {!collapsed ? (
                      <div
                        className={styles.inner}
                        id={gid}
                        role="region"
                        aria-labelledby={`${gid}-head`}
                      >
                        {eps.map((ep: Endpoint) => {
                          const active = activeEndpoint?.id === ep.id;
                          return (
                            <button
                              key={`${tag}-${ep.id}`}
                              type="button"
                              className={`${styles.row} focusRing ${active ? styles.rowActive : ""}`}
                              onClick={() => {
                                setActive(ep);
                                setMobileSidebarOpen(false);
                              }}
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
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <p className={styles.recentLabel}>{t("sidebar.recentActivity")}</p>
          <div className={styles.recentLine}>
            <MaterialIcon name="schedule" size="sm" />
            <span>
              {hasWorkspace
                ? t("sidebar.recentLoaded", { count: endpoints.length })
                : t("sidebar.recentNone")}
            </span>
          </div>
          <button
            type="button"
            className={`${styles.clearLink} focusRing`}
            onClick={() => {
              clearWorkspace();
              setMobileSidebarOpen(false);
            }}
          >
            <MaterialIcon name="delete_sweep" size="sm" />
            {t("sidebar.clearWorkspace")}
          </button>
        </div>
      </aside>
    </>
  );
}
