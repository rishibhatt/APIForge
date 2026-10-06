"use client";

import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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

type ChangeFilter = "all" | "changed" | "unchanged";

/** Translate with an English fallback for keys not yet in en.json (t returns the key when missing). */
function tx(t: TranslateFn, key: string, fallback: string): string {
  const out = t(key);
  return out === key ? fallback : out;
}

function confidenceLabel(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function rowKey(f: FixItem): string {
  return `${f.originalMethod}\u0000${f.original}`;
}

function isChanged(f: FixItem): boolean {
  return f.original !== f.fixed || f.methodChanged;
}

type Seg = { text: string; changed: boolean };

function splitPath(p: string): string[] {
  return p.split("/").filter(Boolean);
}

/**
 * Segment-level diff (LCS over path segments): segments only in the original
 * read as removed, segments only in the suggestion read as added.
 */
function diffPaths(original: string, fixed: string): { from: Seg[]; to: Seg[] } {
  const a = splitPath(original);
  const b = splitPath(fixed);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i]![j] =
        a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const keepA = new Set<number>();
  const keepB = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      keepA.add(i);
      keepB.add(j);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }
  return {
    from: a.map((text, k) => ({ text, changed: !keepA.has(k) })),
    to: b.map((text, k) => ({ text, changed: !keepB.has(k) })),
  };
}

function PathDiff({ segs, kind }: { segs: Seg[]; kind: "del" | "ins" }) {
  if (segs.length === 0) return <code className={styles.path}>/</code>;
  const mark = kind === "del" ? styles.segDel : styles.segIns;
  return (
    <code className={styles.path}>
      {segs.map((s, k) => (
        <Fragment key={k}>
          <span className={styles.slash}>/</span>
          {s.changed ? <span className={mark}>{s.text}</span> : s.text}
        </Fragment>
      ))}
    </code>
  );
}

export default function AutoFixTable({ t, fixes }: AutoFixTableProps) {
  const baseId = useId();
  const [search, setSearch] = useState("");
  const [change, setChange] = useState<ChangeFilter>("all");
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

  const changedTotal = useMemo(() => fixes.filter(isChanged).length, [fixes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fixes.filter((f) => {
      if (change === "changed" && !isChanged(f)) return false;
      if (change === "unchanged" && isChanged(f)) return false;
      if (impact !== "all" && f.impact !== impact) return false;
      if (
        method !== "all" &&
        f.method.toUpperCase() !== method &&
        f.originalMethod.toUpperCase() !== method
      ) {
        return false;
      }
      if (!q) return true;
      const hay = `${f.method} ${f.originalMethod} ${f.original} ${f.fixed} ${f.reason} ${f.improvements.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [fixes, search, change, impact, method]);

  useEffect(() => {
    setPage(1);
  }, [search, change, impact, method, fixes.length]);

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

  const filtersActive =
    search.trim().length > 0 || change !== "all" || impact !== "all" || method !== "all";

  const clearFilters = useCallback(() => {
    setSearch("");
    setChange("all");
    setImpact("all");
    setMethod("all");
  }, []);

  if (fixes.length === 0) {
    return (
      <div className={styles.empty} role="status">
        <MaterialIcon name="route" size="sm" className={styles.emptyIcon} />
        <p className={styles.emptyText}>{t("autoFix.tableEmpty")}</p>
      </div>
    );
  }

  const changeOptions: { key: ChangeFilter; label: string; count: number }[] = [
    { key: "all", label: t("autoFix.filterAll"), count: fixes.length },
    { key: "changed", label: t("autoFix.filterChanged"), count: changedTotal },
    { key: "unchanged", label: t("autoFix.filterUnchanged"), count: fixes.length - changedTotal },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar} role="search">
        <div className={styles.searchWrap}>
          <MaterialIcon name="search" size="sm" className={styles.searchIcon} />
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

        <div className={styles.segmented} role="group" aria-label={t("autoFix.filterChange")}>
          {changeOptions.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${styles.segment} focusRing`}
              aria-pressed={change === o.key}
              onClick={() => setChange(o.key)}
            >
              {o.label}
              <span className={styles.segmentCount}>{o.count}</span>
            </button>
          ))}
        </div>

        <div className={styles.selectWrap}>
          <label htmlFor={`${baseId}-impact`} className="srOnly">
            {t("autoFix.filterImpact")}
          </label>
          <select
            id={`${baseId}-impact`}
            className={`${styles.select} focusRing`}
            value={impact}
            onChange={(e) => setImpact(e.target.value as "all" | FixItem["impact"])}
          >
            <option value="all">{t("autoFix.filterImpactAll")}</option>
            <option value="high">{t("autoFix.impactHigh")}</option>
            <option value="medium">{t("autoFix.impactMed")}</option>
            <option value="low">{t("autoFix.impactLow")}</option>
          </select>
          <MaterialIcon name="expand_more" size="sm" className={styles.selectChevron} />
        </div>

        <div className={styles.selectWrap}>
          <label htmlFor={`${baseId}-method`} className="srOnly">
            {t("autoFix.filterMethod")}
          </label>
          <select
            id={`${baseId}-method`}
            className={`${styles.select} focusRing`}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="all">{t("autoFix.filterMethodAll")}</option>
            {methods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <MaterialIcon name="expand_more" size="sm" className={styles.selectChevron} />
        </div>

        {filtersActive ? (
          <button type="button" className={`${styles.ghostBtn} focusRing`} onClick={clearFilters}>
            <MaterialIcon name="filter_alt_off" size="sm" />
            {t("autoFix.clearFilters")}
          </button>
        ) : null}
      </div>

      <p className={styles.meta} role="status">
        {t("autoFix.showing", {
          from: String(filtered.length === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1),
          to: String(Math.min(effectivePage * PAGE_SIZE, filtered.length)),
          total: String(filtered.length),
        })}
      </p>

      {pageSlice.length === 0 ? (
        <div className={styles.noResults} role="status">
          <p className={styles.noResultsTitle}>
            <MaterialIcon name="filter_alt_off" size="sm" className={styles.emptyIcon} />
            {t("autoFix.noFilterMatchesTitle")}
          </p>
          <p className={styles.noResultsBody}>{t("autoFix.noFilterMatches")}</p>
          <button type="button" className={`${styles.btn} focusRing`} onClick={clearFilters}>
            {t("autoFix.clearFilters")}
          </button>
        </div>
      ) : (
        <div className={styles.tableScroll} tabIndex={0} aria-label={t("autoFix.tableHeading")}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thMethod} scope="col">{t("autoFix.colMethod")}</th>
                <th className={styles.thPath} scope="col">{t("autoFix.colOriginal")}</th>
                <th className={styles.thArrow} aria-hidden />
                <th className={styles.thPath} scope="col">{t("autoFix.colImproved")}</th>
                <th className={styles.thImpact} scope="col">{t("autoFix.filterImpact")}</th>
                <th className={styles.thConf} scope="col">{t("autoFix.colConfidence")}</th>
                <th className={styles.thExpand} scope="col">
                  <span className="srOnly">{t("autoFix.colDetails")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((fix, i) => (
                <FixRow
                  key={rowKey(fix)}
                  fix={fix}
                  expanded={openKey === rowKey(fix)}
                  panelId={`${baseId}-panel-${effectivePage}-${i}`}
                  onToggle={() => toggle(fix)}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 ? (
        <nav className={styles.pager} aria-label={t("autoFix.paginationAria")}>
          <button
            type="button"
            className={`${styles.btn} focusRing`}
            disabled={effectivePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <MaterialIcon name="chevron_left" size="sm" />
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
            className={`${styles.btn} focusRing`}
            disabled={effectivePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            {t("autoFix.pageNext")}
            <MaterialIcon name="chevron_right" size="sm" />
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function impactClass(impact: FixItem["impact"]): string {
  if (impact === "high") return styles.impactHigh;
  if (impact === "medium") return styles.impactMed;
  return styles.impactLow;
}

function impactLabelKey(impact: FixItem["impact"]): string {
  if (impact === "high") return "autoFix.impactHigh";
  if (impact === "medium") return "autoFix.impactMed";
  return "autoFix.impactLow";
}

function changeTypeClass(ct: "removed" | "added" | "modified"): string {
  if (ct === "removed") return styles.chRemoved;
  if (ct === "added") return styles.chAdded;
  return styles.chModified;
}

function FixRow({
  fix,
  expanded,
  panelId,
  onToggle,
  t,
}: {
  fix: FixItem;
  expanded: boolean;
  panelId: string;
  onToggle: () => void;
  t: TranslateFn;
}) {
  const changed = isChanged(fix);
  const pathChanged = fix.original !== fix.fixed;
  const diff = useMemo(() => diffPaths(fix.original, fix.fixed), [fix.original, fix.fixed]);
  const fromLine = `${fix.originalMethod.toUpperCase()} ${fix.original}`;
  const toLine = `${fix.method.toUpperCase()} ${fix.fixed}`;

  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const copyTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );
  const copyFix = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(toLine);
      setCopy("done");
    } catch {
      setCopy("failed");
    }
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopy("idle"), 2000);
  }, [toLine]);

  return (
    <>
      <tr
        className={`${styles.row} ${expanded ? styles.rowOpen : ""} ${changed ? "" : styles.rowUnchanged}`}
        onClick={onToggle}
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
        <td className={`${styles.tdPath} ${styles.tdOrig}`} data-label={t("autoFix.colOriginal")}>
          {pathChanged ? (
            <PathDiff segs={diff.from} kind="del" />
          ) : (
            <code className={styles.path}>{fix.original}</code>
          )}
        </td>
        <td className={styles.tdArrow} aria-hidden>
          <MaterialIcon name="arrow_right_alt" size="sm" />
        </td>
        <td className={`${styles.tdPath} ${styles.tdFixed}`} data-label={t("autoFix.colImproved")}>
          {pathChanged ? (
            <PathDiff segs={diff.to} kind="ins" />
          ) : (
            <span className={styles.noChange}>{t("autoFix.noPathChange")}</span>
          )}
        </td>
        <td className={styles.tdImpact}>
          <span className={`${styles.impact} ${impactClass(fix.impact)}`}>
            <span className="srOnly">{t("autoFix.filterImpact")}: </span>
            {t(impactLabelKey(fix.impact))}
          </span>
        </td>
        <td className={styles.tdConf}>
          <span className="srOnly">{t("autoFix.colConfidence")}: </span>
          {confidenceLabel(fix.confidence)}
        </td>
        <td className={styles.tdExpand}>
          <button
            type="button"
            className={`${styles.expandBtn} focusRing`}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={expanded ? t("autoFix.hideDetails") : t("autoFix.showDetails")}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <MaterialIcon name="expand_more" size="sm" className={styles.expandIcon} />
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className={styles.detailRow}>
          <td colSpan={7} className={styles.detailCell}>
            <div id={panelId} className={styles.detail} role="region">
              <p className={styles.reason}>{fix.reason}</p>
              <div className={styles.diffBox}>
                <div className={styles.diffHead}>
                  <span className={styles.detailLabel}>{tx(t, "autoFix.diffTitle", "Diff")}</span>
                  <button
                    type="button"
                    className={`${styles.copyBtn} ${copy === "done" ? styles.copyDone : ""} ${
                      copy === "failed" ? styles.copyFailed : ""
                    } focusRing`}
                    onClick={() => void copyFix()}
                  >
                    <MaterialIcon
                      name={copy === "done" ? "check" : copy === "failed" ? "error" : "content_copy"}
                      size="xs"
                    />
                    <span aria-live="polite">
                      {copy === "done"
                        ? t("autoFix.copied")
                        : copy === "failed"
                          ? t("autoFix.copyFailed")
                          : tx(t, "autoFix.copyFix", "Copy fix")}
                    </span>
                  </button>
                </div>
                <pre className={styles.diffCode}>
                  {changed ? (
                    <>
                      <span className={styles.diffDel}>
                        <span className={styles.diffSign} aria-hidden>-</span>
                        {fromLine}
                      </span>
                      {"\n"}
                      <span className={styles.diffIns}>
                        <span className={styles.diffSign} aria-hidden>+</span>
                        {toLine}
                      </span>
                    </>
                  ) : (
                    <span className={styles.diffSame}>
                      <span className={styles.diffSign} aria-hidden> </span>
                      {toLine}
                    </span>
                  )}
                </pre>
              </div>
              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt>{t("autoFix.restScore")}</dt>
                  <dd>
                    {t("autoFix.scorePair", {
                      before: String(fix.scoreBefore),
                      after: String(fix.scoreAfter),
                    })}
                    {fix.restCompliant ? (
                      <span className={styles.restBadge}>{t("autoFix.restCompliantBadge")}</span>
                    ) : null}
                  </dd>
                </div>
              </dl>
              {fix.improvements.length > 0 ? (
                <div className={styles.detailBlock}>
                  <p className={styles.detailLabel}>{t("autoFix.improvementsTitle")}</p>
                  <ul className={styles.improvementList}>
                    {fix.improvements.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {fix.changes.length > 0 ? (
                <div className={styles.detailBlock}>
                  <p className={styles.detailLabel}>{t("autoFix.changesTitle")}</p>
                  <ul className={styles.changeList}>
                    {fix.changes.map((c, j) => (
                      <li key={`${c.from}-${c.to}-${j}`} className={styles.changeItem}>
                        <span className={`${styles.chTag} ${changeTypeClass(c.type)}`}>
                          {c.type}
                        </span>
                        <span className={styles.chCategory}>{c.category}</span>
                        {c.from ? <code className={styles.chFrom}>{c.from}</code> : null}
                        {c.from && c.to ? (
                          <MaterialIcon name="arrow_right_alt" size="xs" className={styles.chArrow} />
                        ) : null}
                        {c.to ? <code className={styles.chTo}>{c.to}</code> : null}
                      </li>
                    ))}
                  </ul>
                </div>
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
