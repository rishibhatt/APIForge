"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { collectionIconForTagName } from "@/lib/collection-icon";
import { groupEndpointsByTag } from "@/lib/extract-endpoints";
import { useFilteredEndpoints } from "@/hooks/useFilteredEndpoints";
import { WORKSPACE_SEARCH_INPUT_ID } from "@/constants/workspace-ui";
import {
  HTTP_METHODS_FILTER,
  useWorkspaceStore,
  type MethodFilterKey,
} from "@/store/workspaceStore";
import type { Endpoint } from "@/types/api";
import styles from "./WorkspaceSidebar.module.css";

function endpointShortLabel(ep: Endpoint): string {
  const parts = ep.path.split("/").filter(Boolean);
  const last = parts[parts.length - 1]?.replace(/\{[^}]+\}/g, "") ?? "";
  if (last && last.length > 0) return last;
  const s = ep.summary?.trim();
  return s ? s.split(/\s+/).slice(0, 3).join(" ") : ep.path;
}

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
    HEAD: styles.chipHead,
    OPTIONS: styles.chipOptions,
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
  const specTitle = useWorkspaceStore((s) => s.specTitle);
  const specVersion = useWorkspaceStore((s) => s.specVersion);
  const selectedCollectionTag = useWorkspaceStore(
    (s) => s.selectedCollectionTag,
  );
  const setSelectedCollectionTag = useWorkspaceStore(
    (s) => s.setSelectedCollectionTag,
  );
  const setActiveEndpoint = useWorkspaceStore((s) => s.setActiveEndpoint);
  const mobileOpen = useWorkspaceStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useWorkspaceStore(
    (s) => s.setMobileSidebarOpen,
  );
  const activeEndpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const endpointSearch = useWorkspaceStore((s) => s.endpointSearch);
  const setEndpointSearch = useWorkspaceStore((s) => s.setEndpointSearch);
  const methodFilters = useWorkspaceStore((s) => s.methodFilters);
  const toggleMethodFilter = useWorkspaceStore((s) => s.toggleMethodFilter);
  const focusMode = useWorkspaceStore((s) => s.focusMode);
  const endpoints = useWorkspaceStore((s) => s.endpoints);

  const filtered = useFilteredEndpoints();
  const grouped = useMemo(() => groupEndpointsByTag(filtered), [filtered]);

  const groupedKey = useMemo(
    () => Array.from(grouped.keys()).sort().join("\0"),
    [grouped],
  );

  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedTags(new Set(grouped.keys()));
  }, [groupedKey, grouped]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.getElementById(WORKSPACE_SEARCH_INPUT_ID);
        if (el instanceof HTMLInputElement) {
          el.focus();
          el.select();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const collapseAllTags = useCallback(() => {
    setExpandedTags(new Set());
  }, []);

  const expandAllTags = useCallback(() => {
    setExpandedTags(new Set(grouped.keys()));
  }, [grouped]);

  const allTagsCollapsed =
    hasWorkspace && grouped.size > 0 && expandedTags.size === 0;

  const methodChipClass = useCallback((method: string) => {
    const m = method.toUpperCase();
    if (m === "GET") return styles.methodGet;
    if (m === "POST") return styles.methodPost;
    if (m === "PUT") return styles.methodPut;
    if (m === "PATCH") return styles.methodPatch;
    if (m === "DELETE") return styles.methodDelete;
    if (m === "HEAD") return styles.methodHead;
    if (m === "OPTIONS") return styles.methodOptions;
    return styles.methodOther;
  }, []);

  const sidebarTitle =
    hasWorkspace && specTitle && specTitle.trim().length > 0
      ? specTitle.trim()
      : t("workspace.workspaceLabel");

  const sidebarSubtitle = (() => {
    if (!hasWorkspace) return t("sidebar.specIdle");
    const v = specVersion?.trim();
    if (v && v.length > 0) {
      return t("sidebar.specVersion", {
        version: v.replace(/^v\s*/i, ""),
      });
    }
    return t("sidebar.loadedActive");
  })();

  return (
    <>
      {mobileOpen && !focusMode ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label={t("a11y.closeExplorer")}
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={`${styles.aside} ${mobileOpen && !focusMode ? styles.open : ""} ${!hasWorkspace ? styles.asideHiddenDesktop : ""} ${hasWorkspace && focusMode ? styles.asideFocusMode : ""}`}
        aria-label={t("sidebar.apiExplorer")}
        aria-hidden={hasWorkspace && focusMode ? true : undefined}
      >
        <div className={styles.head}>
          <div className={styles.headTop}>
            <div
              className={styles.iconWrap}
              title={t("sidebar.workspaceWorkflowIcon")}
            >
              <MaterialIcon
                name="account_tree"
                size="md"
                className={styles.workflowIcon}
              />
            </div>
            <div className={styles.headTitles}>
              <h2 className={styles.title} title={sidebarTitle}>
                {sidebarTitle}
              </h2>
              <p className={styles.versionLine} title={sidebarSubtitle}>
                {sidebarSubtitle}
              </p>
            </div>
          </div>
        </div>

        {hasWorkspace ? (
          <div className={styles.metricsBlock} aria-label={t("sidebar.metricsAria")}>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>{t("sidebar.statusParsed")}</span>
              <span className={styles.statusCount}>
                {t("sidebar.endpointCount", { count: endpoints.length })}
              </span>
            </div>
          </div>
        ) : null}

        {hasWorkspace ? (
          <div className={styles.filtersPanel}>
            <div className={styles.searchWrap}>
              <MaterialIcon
                name="search"
                className={styles.searchIcon}
                size="sm"
              />
              <label htmlFor={WORKSPACE_SEARCH_INPUT_ID} className="srOnly">
                {t("sidebar.searchEndpoints")}
              </label>
              <input
                id={WORKSPACE_SEARCH_INPUT_ID}
                type="search"
                className={styles.searchInput}
                placeholder={t("sidebar.searchEndpoints")}
                value={endpointSearch}
                onChange={(e) => setEndpointSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
            <p className={styles.filtersLabel}>{t("sidebar.methodFilters")}</p>
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

        {hasWorkspace && filtered.length > 0 ? (
          <div className={styles.collectionsToolbar}>
            <span className={styles.collectionsToolbarLabel}>
              {t("workspace.collectionsHeading")}
            </span>
            {grouped.size > 0 ? (
              <button
                type="button"
                className={`${styles.toolIcon} focusRing`}
                title={
                  allTagsCollapsed
                    ? t("workspace.expandAll")
                    : t("workspace.collapseAll")
                }
                aria-label={
                  allTagsCollapsed
                    ? t("workspace.expandAll")
                    : t("workspace.collapseAll")
                }
                onClick={() =>
                  allTagsCollapsed ? expandAllTags() : collapseAllTags()
                }
              >
                <MaterialIcon
                  name={allTagsCollapsed ? "unfold_more" : "unfold_less"}
                  size="sm"
                />
              </button>
            ) : null}
          </div>
        ) : null}

        <nav
          className={styles.scroll}
          aria-label={t("workspace.collectionsHeading")}
        >
          {!hasWorkspace ? (
            <p className={styles.empty}>{t("sidebar.emptyEndpoints")}</p>
          ) : filtered.length === 0 ? (
            <p className={styles.empty}>{t("sidebar.noMatchingEndpoints")}</p>
          ) : (
            Array.from(grouped.entries()).map(([tag, eps]) => {
              const expanded = expandedTags.has(tag);
              const tagActive = selectedCollectionTag === tag;
              const collectionIcon = collectionIconForTagName(tag);
              return (
                <div key={tag} className={styles.tagGroup}>
                  <div className={styles.tagGroupHead}>
                    <button
                      type="button"
                      className={`${styles.folderRow} focusRing`}
                      onClick={() => toggleTag(tag)}
                      aria-expanded={expanded}
                    >
                      <MaterialIcon
                        name={
                          expanded ? "keyboard_arrow_down" : "keyboard_arrow_right"
                        }
                        size="sm"
                        className={styles.chevron}
                      />
                    </button>
                    <button
                      type="button"
                      className={`${styles.tagTitleBtn} focusRing ${tagActive ? styles.tagTitleActive : ""}`}
                      onClick={() => {
                        setSelectedCollectionTag(tag);
                        setExpandedTags((prev) => new Set(prev).add(tag));
                        setMobileSidebarOpen(false);
                      }}
                    >
                      <MaterialIcon
                        name={collectionIcon}
                        size="sm"
                        className={styles.collectionGlyph}
                      />
                      <span className={styles.tagTitle}>{tag}</span>
                      <span className={styles.tagCountBadge} aria-hidden>
                        {eps.length}
                      </span>
                    </button>
                  </div>
                  {expanded ? (
                    <ul className={styles.endpointList}>
                      {eps.map((ep) => {
                        const active = activeEndpoint?.id === ep.id;
                        return (
                          <li key={ep.id}>
                            <button
                              type="button"
                              className={`${styles.endpointRow} focusRing ${active ? styles.endpointRowActive : ""}`}
                              onClick={() => {
                                setActiveEndpoint(ep);
                                setSelectedCollectionTag(tag);
                                setMobileSidebarOpen(false);
                              }}
                            >
                              <span
                                className={`${styles.methodChip} ${methodChipClass(ep.method)}`}
                              >
                                {ep.method.toUpperCase()}
                              </span>
                              <span className={styles.endpointName}>
                                {endpointShortLabel(ep)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })
          )}
        </nav>
      </aside>
    </>
  );
}
