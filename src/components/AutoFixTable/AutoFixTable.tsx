"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { FixItem } from "@/lib/fixEngine";
import MethodBadge from "@/components/atomic/atoms/MethodBadge/MethodBadge";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { TranslateFn } from "@/context/LanguageContext";
import styles from "./AutoFixTable.module.css";

const PAGE_SIZE = 25;

export interface AutoFixTableProps {
  t: TranslateFn;
  fixes: FixItem[];
}

function confidenceLabel(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function rowKey(f: FixItem): string {
  return `${f.originalMethod}\u0000${f.original}`;
}

export default function AutoFixTable({ t, fixes }: AutoFixTableProps) {
  const baseId = useId();
  const [search, setSearch] = useState("");
  const [impact, setImpact] = useState<"all" | FixItem["impact"]>("all");
  const [method, setMethod] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const methods = useMemo(() => {
    const set = new Set<string>();
    for (const f of fixes) {
      set.add(f.method.toUpperCase());
      set.add(f.originalMethod.toUpperCase());
    }
    return Array.from(set).sort();
  }, [fixes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fixes.filter((f) => {
      if (impact !== "all" && f.impact !== impact) return false;
      if (method !== "all" && f.method.toUpperCase() !== method && f.originalMethod.toUpperCase() !== method) return false;
      if (!q) return true;
      const hay = `${f.method} ${f.originalMethod} ${f.original} ${f.fixed} ${f.reason} ${f.scoreBefore} ${f.scoreAfter} ${f.improvements.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [fixes, search, impact, method]);

  useEffect(() => {
    setPage(1);
  }, [search, impact, method, fixes.length]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const effectivePage = Math.min(page, pageCount);

  const pageSlice = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, effectivePage]);

  const toggle = useCallback((f: FixItem) => {
    const k = rowKey(f);
    setOpenKey((cur) => (cur === k ? null : k));
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setImpact("all");
    setMethod("all");
  }, []);

  if (fixes.length === 0) {
    return <p className={styles.empty}>{t("autoFix.tableEmpty")}</p>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar} role="search">
        <div className={styles.searchWrap}>
          <MaterialIcon name="search" size="sm" className={styles.searchIcon} aria-hidden />
          <label htmlFor={`${baseId}-search`} className="srOnly">
            {t("autoFix.searchLabel")}
          </label>
          <input
            id={`${baseId}-search`}
            type="search"
            className={`${styles.searchInput} focusRing`}
            placeholder={t("autoFix.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className={styles.filters}>
          <label className={styles.filterLabel}>
            <span className={styles.filterSpan}>{t("autoFix.filterImpact")}</span>
            <select
              className={`${styles.select} focusRing`}
              value={impact}
              onChange={(e) =>
                setImpact(e.target.value as "all" | FixItem["impact"])
              }
            >
              <option value="all">{t("autoFix.filterAll")}</option>
              <option value="high">{t("autoFix.impactHigh")}</option>
              <option value="medium">{t("autoFix.impactMed")}</option>
              <option value="low">{t("autoFix.impactLow")}</option>
            </select>
          </label>
          <label className={styles.filterLabel}>
            <span className={styles.filterSpan}>{t("autoFix.filterMethod")}</span>
            <select
              className={`${styles.select} focusRing`}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="all">{t("autoFix.filterAll")}</option>
              {methods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`${styles.clearBtn} focusRing`}
            onClick={clearFilters}
          >
            {t("autoFix.clearFilters")}
          </button>
        </div>
      </div>

      <p className={styles.meta} role="status">
        {t("autoFix.showing", {
          from: String(filtered.length === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1),
          to: String(Math.min(effectivePage * PAGE_SIZE, filtered.length)),
          total: String(filtered.length),
        })}
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thMethod}>{t("autoFix.colMethod")}</th>
              <th className={styles.thPath}>{t("autoFix.colOriginal")}</th>
              <th className={styles.thPath}>{t("autoFix.colImproved")}</th>
              <th className={styles.thConf}>{t("autoFix.colConfidence")}</th>
              <th className={styles.thExpand} aria-hidden />
            </tr>
          </thead>
          <tbody>
            {pageSlice.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.noResults}>
                  {t("autoFix.noFilterMatches")}
                </td>
              </tr>
            ) : (
              pageSlice.map((fix, i) => {
                const expanded = openKey === rowKey(fix);
                const panelId = `${baseId}-panel-${effectivePage}-${i}`;
                const rowId = `${baseId}-row-${effectivePage}-${i}`;

                return (
                  <FragmentRow
                    key={rowKey(fix)}
                    fix={fix}
                    expanded={expanded}
                    panelId={panelId}
                    rowId={rowId}
                    onToggle={() => toggle(fix)}
                    t={t}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <nav className={styles.pager} aria-label={t("autoFix.paginationAria")}>
          <button
            type="button"
            className={`${styles.pageBtn} focusRing`}
            disabled={effectivePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <MaterialIcon name="chevron_left" size="sm" aria-hidden />
            {t("autoFix.pagePrev")}
          </button>
          <span className={styles.pageStatus}>
            {t("autoFix.pageStatus", {
              page: String(effectivePage),
              pages: String(pageCount),
            })}
          </span>
          <button
            type="button"
            className={`${styles.pageBtn} focusRing`}
            disabled={effectivePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            {t("autoFix.pageNext")}
            <MaterialIcon name="chevron_right" size="sm" aria-hidden />
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function impactRowClass(impact: FixItem["impact"]): string {
  switch (impact) {
    case "high":
      return styles.impactHigh;
    case "medium":
      return styles.impactMed;
    default:
      return styles.impactLow;
  }
}

function changeTypeClass(ct: "removed" | "added" | "modified"): string {
  switch (ct) {
    case "removed":
      return styles.chRemoved;
    case "added":
      return styles.chAdded;
    default:
      return styles.chModified;
  }
}

function FragmentRow({
  fix,
  expanded,
  panelId,
  rowId,
  onToggle,
  t,
}: {
  fix: FixItem;
  expanded: boolean;
  panelId: string;
  rowId: string;
  onToggle: () => void;
  t: TranslateFn;
}) {
  return (
    <>
      <tr
        id={rowId}
        className={`${styles.row} ${expanded ? styles.rowOpen : ""}`}
      >
        <td className={styles.tdMethod}>
          <div className={styles.methodCell}>
            <MethodBadge method={fix.method} />
            {fix.methodChanged ? (
              <span className={styles.methodWas}>
                {t("autoFix.methodWas", { method: fix.originalMethod })}
              </span>
            ) : null}
          </div>
        </td>
        <td className={styles.tdOriginal}>
          <code className={styles.pathMuted}>{fix.original}</code>
        </td>
        <td className={styles.tdFixed}>
          <code className={styles.pathHighlight}>{fix.fixed}</code>
        </td>
        <td className={styles.tdConf}>
          <span className={styles.confBadge}>{confidenceLabel(fix.confidence)}</span>
          <span className={`${styles.impact} ${impactRowClass(fix.impact)}`}>
            {fix.impact}
          </span>
        </td>
        <td className={styles.tdExpand}>
          <button
            type="button"
            className={`${styles.expandBtn} focusRing`}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={onToggle}
          >
            <MaterialIcon
              name={expanded ? "expand_less" : "expand_more"}
              size="sm"
              aria-hidden
            />
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className={styles.detailRow}>
          <td colSpan={5} className={styles.detailCell}>
            <div id={panelId} className={styles.detailCard} role="region">
              <p className={styles.reason}>{fix.reason}</p>
              <dl className={styles.scoreGrid}>
                <div className={styles.scoreRow}>
                  <dt>{t("autoFix.restScore")}</dt>
                  <dd>
                    {t("autoFix.scorePair", {
                      before: String(fix.scoreBefore),
                      after: String(fix.scoreAfter),
                    })}
                    {fix.restCompliant ? (
                      <span className={styles.restBadge}>
                        {t("autoFix.restCompliantBadge")}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>
              {fix.improvements.length > 0 ? (
                <div className={styles.improvementsBlock}>
                  <p className={styles.improvementsTitle}>
                    {t("autoFix.improvementsTitle")}
                  </p>
                  <ul className={styles.improvementList}>
                    {fix.improvements.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {fix.changes.length > 0 ? (
                <ul className={styles.changeList}>
                  {fix.changes.map((c, j) => (
                    <li key={`${c.from}-${c.to}-${j}`} className={styles.changeItem}>
                      <span className={`${styles.chTag} ${changeTypeClass(c.type)}`}>
                        {c.type}
                      </span>
                      <span className={styles.chCategory}>{c.category}</span>
                      <code className={styles.chFrom}>{c.from}</code>
                      <span className={styles.chArrow} aria-hidden>
                        →
                      </span>
                      <code className={styles.chTo}>{c.to}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.noChanges}>{t("autoFix.noChanges")}</p>
              )}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
