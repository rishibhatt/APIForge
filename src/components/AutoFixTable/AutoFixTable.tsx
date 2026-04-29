"use client";

import { useCallback, useId, useState } from "react";
import type { FixItem } from "@/lib/fixEngine";
import { AUTO_FIX_FREE_PREVIEW } from "@/lib/auto-fix-preview";
import MethodBadge from "@/components/atomic/atoms/MethodBadge/MethodBadge";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { TranslateFn } from "@/context/LanguageContext";
import styles from "./AutoFixTable.module.css";

export interface AutoFixTableProps {
  t: TranslateFn;
  fixes: FixItem[];
}

function confidenceLabel(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default function AutoFixTable({ t, fixes }: AutoFixTableProps) {
  const baseId = useId();
  const [openRow, setOpenRow] = useState<number | null>(null);

  const toggle = useCallback((i: number) => {
    if (i >= AUTO_FIX_FREE_PREVIEW) return;
    setOpenRow((cur) => (cur === i ? null : i));
  }, []);

  if (fixes.length === 0) {
    return (
      <p className={styles.empty}>{t("autoFix.tableEmpty")}</p>
    );
  }

  return (
    <div className={styles.wrap}>
      {fixes.length > AUTO_FIX_FREE_PREVIEW ? (
        <p className={styles.previewNote} role="status">
          {t("autoFix.previewNote", { n: String(AUTO_FIX_FREE_PREVIEW) })}
        </p>
      ) : null}
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
            {fixes.map((fix, i) => {
              const locked = i >= AUTO_FIX_FREE_PREVIEW;
              const expanded = openRow === i && !locked;
              const panelId = `${baseId}-panel-${i}`;
              const rowId = `${baseId}-row-${i}`;

              return (
                <FragmentRow
                  key={`${fix.method}-${fix.original}-${i}`}
                  fix={fix}
                  locked={locked}
                  expanded={expanded}
                  panelId={panelId}
                  rowId={rowId}
                  onToggle={() => toggle(i)}
                  t={t}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {fixes.length > AUTO_FIX_FREE_PREVIEW ? (
        <div className={styles.lockBanner}>
          <MaterialIcon name="lock" size="sm" aria-hidden />
          <span>{t("autoFix.unlockHint")}</span>
        </div>
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

function changeTypeClass(t: "removed" | "added" | "modified"): string {
  switch (t) {
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
  locked,
  expanded,
  panelId,
  rowId,
  onToggle,
  t,
}: {
  fix: FixItem;
  locked: boolean;
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
        className={`${styles.row} ${locked ? styles.rowLocked : ""} ${expanded ? styles.rowOpen : ""}`}
      >
        <td className={styles.tdMethod}>
          <MethodBadge method={fix.method} />
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
          {!locked ? (
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
          ) : (
            <span className={styles.expandPlaceholder} aria-hidden />
          )}
        </td>
      </tr>
      {!locked && expanded ? (
        <tr className={styles.detailRow}>
          <td colSpan={5} className={styles.detailCell}>
            <div id={panelId} className={styles.detailCard} role="region">
              <p className={styles.reason}>{fix.reason}</p>
              {fix.changes.length > 0 ? (
                <ul className={styles.changeList}>
                  {fix.changes.map((c, j) => (
                    <li key={`${c.from}-${c.to}-${j}`} className={styles.changeItem}>
                      <span className={`${styles.chTag} ${changeTypeClass(c.type)}`}>
                        {c.type}
                      </span>
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
