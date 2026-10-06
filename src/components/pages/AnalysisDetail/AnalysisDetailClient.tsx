"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { ApiIssue } from "@/lib/api-quality-score/types";
import { SCORE_CATEGORY_MAX } from "@/lib/api-quality-score/types";
import {
  useAnalysisSession,
  useWorkspaceReturnHref,
  withSpecQuery,
  type StoredAnalysisPayload,
} from "@/lib/analysis-session";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { TranslateFn } from "@/context/LanguageContext";
import { useLanguage } from "@/hooks/useLanguage";
import {
  ReportBreadcrumbs,
  ReportHeader,
  ReportLayout,
  ReportSkeleton,
  ReportState,
  reportStyles as ui,
  tx,
  useFlash,
} from "@/components/pages/shared/ReportChrome";
import MissingSession from "@/components/pages/shared/MissingSession";
import styles from "./AnalysisDetail.module.css";

const CATEGORY_KEYS: { key: ApiIssue["type"]; labelKey: string }[] = [
  { key: "naming", labelKey: "qualityScore.breakdown.naming" },
  { key: "http", labelKey: "qualityScore.breakdown.http" },
  { key: "structure", labelKey: "qualityScore.breakdown.structure" },
  { key: "consistency", labelKey: "qualityScore.breakdown.consistency" },
  { key: "versioning", labelKey: "qualityScore.breakdown.versioning" },
  { key: "errorHandling", labelKey: "qualityScore.breakdown.errors" },
  { key: "documentation", labelKey: "qualityScore.breakdown.docs" },
];

const CATEGORY_LABEL = Object.fromEntries(
  CATEGORY_KEYS.map((c) => [c.key, c.labelKey]),
) as Record<ApiIssue["type"], string>;

const PAGE_SIZE = 50;

const SEVERITIES: ApiIssue["severity"][] = ["high", "medium", "low"];

type SeverityFilter = "all" | ApiIssue["severity"];
type CategoryFilter = "all" | ApiIssue["type"];

type Grade = { letter: "A" | "B" | "C" | "D" | "F"; verdict: string; tone: string };

/** Letter grade + verdict from the 0-100 score. Tone drives the accent on the score panel. */
function gradeFor(score: number, t: TranslateFn): Grade {
  if (score >= 90) return { letter: "A", verdict: tx(t, "qualityScore.grade.A", "Excellent"), tone: styles.toneGood };
  if (score >= 80) return { letter: "B", verdict: tx(t, "qualityScore.grade.B", "Strong"), tone: styles.toneGood };
  if (score >= 70) return { letter: "C", verdict: tx(t, "qualityScore.grade.C", "Fair"), tone: styles.toneWarn };
  if (score >= 50) return { letter: "D", verdict: tx(t, "qualityScore.grade.D", "Needs work"), tone: styles.toneWarn };
  return { letter: "F", verdict: tx(t, "qualityScore.grade.F", "At risk"), tone: styles.toneBad };
}

function severityClass(sev: ApiIssue["severity"]): string {
  if (sev === "high") return styles.sevHigh;
  if (sev === "medium") return styles.sevMed;
  return styles.sevLow;
}

export default function AnalysisDetailClient({ id }: { id: string }) {
  const { t } = useLanguage();
  const session = useAnalysisSession(id);
  const backHref = useWorkspaceReturnHref(session.specUrl);

  const crumbsAria = t("qualityScore.analysis.crumbsAria");
  const crumbWorkspace = t("qualityScore.analysis.crumbWorkspace");
  const pageTitle = t("qualityScore.analysis.pageTitle");

  if (session.status === "loading") {
    return (
      <ReportLayout t={t}>
        <ReportSkeleton label={t("qualityScore.analysis.loading")} />
      </ReportLayout>
    );
  }

  if (session.status === "missing") {
    return (
      <ReportLayout t={t}>
        <ReportBreadcrumbs
          ariaLabel={crumbsAria}
          crumbs={[{ label: crumbWorkspace, href: backHref }, { label: pageTitle }]}
        />
        <MissingSession t={t} specUrl={session.specUrl} />
      </ReportLayout>
    );
  }

  return (
    <ReportLayout t={t}>
      <ReportBreadcrumbs
        ariaLabel={crumbsAria}
        crumbs={[{ label: crumbWorkspace, href: backHref }, { label: pageTitle }]}
      />
      <AnalysisReport t={t} id={id} payload={session.payload} specUrl={session.specUrl} />
    </ReportLayout>
  );
}

function AnalysisReport({
  t,
  id,
  payload,
  specUrl,
}: {
  t: TranslateFn;
  id: string;
  payload: StoredAnalysisPayload;
  specUrl: string | null;
}) {
  const searchId = useId();
  const catId = useId();
  const { result, specTitle } = payload;
  const { totalScore, breakdown, issues, suggestions } = result;

  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<SeverityFilter>("all");
  const [catFilter, setCatFilter] = useState<CategoryFilter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const normSearch = search.trim().toLowerCase();

  const severityCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const i of issues) counts[i.severity] += 1;
    return counts;
  }, [issues]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ApiIssue["type"], number>();
    for (const i of issues) counts.set(i.type, (counts.get(i.type) ?? 0) + 1);
    return counts;
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      if (sevFilter !== "all" && i.severity !== sevFilter) return false;
      if (catFilter !== "all" && i.type !== catFilter) return false;
      if (normSearch && !`${i.message} ${i.example_fix}`.toLowerCase().includes(normSearch)) {
        return false;
      }
      return true;
    });
  }, [issues, sevFilter, catFilter, normSearch]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [sevFilter, catFilter, normSearch]);

  const visibleIssues = filteredIssues.slice(0, visible);
  const remaining = filteredIssues.length - visibleIssues.length;
  const filtersActive = sevFilter !== "all" || catFilter !== "all" || normSearch.length > 0;

  const clearFilters = useCallback(() => {
    setSearch("");
    setSevFilter("all");
    setCatFilter("all");
  }, []);

  const [exportState, flashExport] = useFlash();

  const exportJson = useCallback(() => {
    try {
      const data = {
        specTitle,
        specUrl,
        analyzedAt: new Date(payload.createdAt).toISOString(),
        totalScore,
        breakdown,
        issues,
        suggestions,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apiforge-analysis-${id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flashExport("done");
    } catch {
      flashExport("failed");
    }
  }, [specTitle, specUrl, payload.createdAt, totalScore, breakdown, issues, suggestions, id, flashExport]);

  const focusPillar = useCallback((key: ApiIssue["type"]) => {
    setCatFilter((cur) => (cur === key ? "all" : key));
    document.getElementById("issues")?.scrollIntoView({ block: "start" });
  }, []);

  const analyzedAt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(payload.createdAt));
    } catch {
      return null;
    }
  }, [payload.createdAt]);

  const score = Math.min(100, Math.max(0, Math.round(totalScore)));
  const grade = gradeFor(score, t);
  const endpointCount = payload.endpoints?.length ?? null;
  const autoFixHref = withSpecQuery(`/auto-fix/${id}`, specUrl);

  const exportLabel =
    exportState === "done"
      ? tx(t, "qualityScore.analysis.exported", "Downloaded")
      : exportState === "failed"
        ? tx(t, "qualityScore.analysis.exportFailed", "Export failed")
        : t("qualityScore.analysis.exportJson");

  return (
    <>
      <ReportHeader
        title={t("qualityScore.analysis.pageTitle")}
        description={t("qualityScore.analysis.description")}
        meta={
          <>
            {specTitle ? (
              <span className={ui.metaItem}>
                <span className={ui.metaKey}>{t("qualityScore.specLabel")}</span>
                <span className={ui.metaValue} title={specUrl ?? undefined}>
                  {specTitle}
                </span>
              </span>
            ) : null}
            {endpointCount !== null ? (
              <span className={ui.metaItem}>
                {t("qualityScore.analysis.endpointsMeta", { count: endpointCount })}
              </span>
            ) : null}
            {analyzedAt ? (
              <span className={ui.metaItem}>
                {t("qualityScore.analysis.analyzedMeta", { time: analyzedAt })}
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            <button
              type="button"
              className={`${ui.btn} ${exportState === "done" ? ui.btnDone : ""} ${
                exportState === "failed" ? ui.btnFailed : ""
              } focusRing`}
              onClick={exportJson}
            >
              <MaterialIcon
                name={exportState === "done" ? "check" : exportState === "failed" ? "error" : "download"}
                size="sm"
              />
              <span aria-live="polite">{exportLabel}</span>
            </button>
            <Link href={autoFixHref} className={`${ui.btnPrimary} focusRing`}>
              <MaterialIcon name="auto_fix_high" size="sm" />
              {t("autoFix.ctaFromAnalysis")}
            </Link>
          </>
        }
      />

      <section className={styles.summary} aria-labelledby="score-h">
        <div className={`${ui.panel} ${styles.scorePanel} ${grade.tone}`}>
          <div className={ui.panelHead}>
            <h2 id="score-h" className={ui.label}>
              {t("qualityScore.analysis.scoreLabel")}
            </h2>
            <span className={ui.label}>
              {tx(t, "qualityScore.analysis.deterministic", "Rule-based")}
            </span>
          </div>
          <div className={styles.scoreBody}>
            <div className={styles.scoreRow}>
              <p className={styles.scoreLine}>
                <span className="srOnly">{t("qualityScore.ariaScore")}: </span>
                <span className={styles.scoreNum}>{score}</span>
                <span className={styles.scoreMax}>/100</span>
              </p>
              <div className={styles.grade}>
                <span className={styles.gradeLetter} aria-hidden>
                  {grade.letter}
                </span>
                <span className={styles.gradeText}>
                  <span className={ui.label}>{tx(t, "qualityScore.gradeLabel", "Grade")}</span>
                  <span className={styles.verdict}>
                    <span className="srOnly">{grade.letter}, </span>
                    {grade.verdict}
                  </span>
                </span>
              </div>
            </div>
            <div className={styles.scoreTrack} aria-hidden>
              <span className={styles.scoreFill} style={{ width: `${score}%` }} />
            </div>
            <dl className={styles.sevSummary}>
              {SEVERITIES.map((s) => (
                <div key={s} className={styles.sevSummaryItem}>
                  <dt className={`${styles.sevKey} ${severityClass(s)}`}>
                    <span className={styles.sevDot} aria-hidden />
                    {t(`qualityScore.analysis.sev.${s}`)}
                  </dt>
                  <dd>{severityCounts[s]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className={`${ui.panel} ${styles.pillarPanel}`}>
          <div className={ui.panelHead}>
            <h2 className={ui.label}>{t("qualityScore.breakdownTitle")}</h2>
            {issues.length > 0 ? (
              <span className={`${ui.label} ${styles.pillarHint}`}>
                {tx(t, "qualityScore.analysis.pillarHint", "Select to filter issues")}
              </span>
            ) : null}
          </div>
          <div className={styles.pillarHead} aria-hidden>
            <span className={ui.label}>{tx(t, "qualityScore.analysis.colPillar", "Pillar")}</span>
            <span />
            <span className={`${ui.label} ${styles.num}`}>
              {tx(t, "qualityScore.analysis.colPoints", "Points")}
            </span>
            <span className={`${ui.label} ${styles.num}`}>
              {tx(t, "qualityScore.analysis.colIssues", "Issues")}
            </span>
          </div>
          <ul className={styles.pillarList}>
            {CATEGORY_KEYS.map(({ key, labelKey }) => {
              const earned = breakdown[key];
              const max = SCORE_CATEGORY_MAX[key];
              const pct = max > 0 ? Math.min(100, (earned / max) * 100) : 0;
              const count = categoryCounts.get(key) ?? 0;
              const fillTone = pct >= 100 ? styles.fillFull : pct < 50 ? styles.fillLow : "";
              return (
                <li key={key}>
                  <button
                    type="button"
                    className={`${styles.pillarRow} focusRing`}
                    aria-pressed={catFilter === key}
                    disabled={count === 0}
                    onClick={() => focusPillar(key)}
                  >
                    <span className={styles.pillarName}>{t(labelKey)}</span>
                    <span className={styles.track} aria-hidden>
                      <span className={`${styles.fill} ${fillTone}`} style={{ width: `${pct}%` }} />
                    </span>
                    <span className={`${styles.pillarPts} ${styles.num}`}>
                      {earned}
                      <span className={styles.ptsMax}>/{max}</span>
                    </span>
                    <span className={`${styles.pillarCount} ${styles.num}`}>
                      {count > 0 ? (
                        count
                      ) : (
                        <>
                          <MaterialIcon name="check" size="xs" className={styles.pillarOk} />
                          <span className="srOnly">0</span>
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section id="issues" className={styles.issueSection} aria-labelledby="iss-h">
        <div className={styles.sectionHead}>
          <h2 id="iss-h" className={styles.sectionTitle}>
            {t("qualityScore.issuesTitle")}
            <span className={styles.countBadge}>{issues.length}</span>
          </h2>
        </div>

        {issues.length === 0 ? (
          <ReportState
            compact
            tone="success"
            icon="task_alt"
            title={t("qualityScore.analysis.noIssuesTitle")}
            body={t("qualityScore.analysis.noIssuesBody")}
            actions={
              <Link href={autoFixHref} className={`${ui.btn} focusRing`}>
                <MaterialIcon name="auto_fix_high" size="sm" />
                {t("autoFix.ctaFromAnalysis")}
              </Link>
            }
          />
        ) : (
          <>
            <div className={styles.toolbar} role="search">
              <div className={styles.searchWrap}>
                <MaterialIcon name="search" size="sm" className={styles.searchIcon} />
                <label htmlFor={searchId} className="srOnly">
                  {t("qualityScore.analysis.searchLabel")}
                </label>
                <input
                  id={searchId}
                  type="search"
                  className={`${styles.searchInput} focusRing`}
                  placeholder={t("qualityScore.analysis.searchPlaceholder")}
                  value={search}
                  autoComplete="off"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div
                className={styles.segmented}
                role="group"
                aria-label={t("qualityScore.analysis.severityFilter")}
              >
                <button
                  type="button"
                  className={`${styles.segment} focusRing`}
                  aria-pressed={sevFilter === "all"}
                  onClick={() => setSevFilter("all")}
                >
                  {t("qualityScore.analysis.severityAll")}
                </button>
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`${styles.segment} ${severityClass(s)} focusRing`}
                    aria-pressed={sevFilter === s}
                    disabled={severityCounts[s] === 0}
                    onClick={() => setSevFilter(s)}
                  >
                    <span className={styles.sevDot} aria-hidden />
                    {t(`qualityScore.analysis.sev.${s}`)}
                    <span className={styles.segmentCount}>{severityCounts[s]}</span>
                  </button>
                ))}
              </div>

              <div className={styles.selectWrap}>
                <label htmlFor={catId} className="srOnly">
                  {t("qualityScore.analysis.categoryFilter")}
                </label>
                <select
                  id={catId}
                  className={`${styles.select} focusRing`}
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value as CategoryFilter)}
                >
                  <option value="all">{t("qualityScore.analysis.categoryAll")}</option>
                  {CATEGORY_KEYS.map(({ key, labelKey }) => (
                    <option key={key} value={key} disabled={!categoryCounts.get(key)}>
                      {t(labelKey)} ({categoryCounts.get(key) ?? 0})
                    </option>
                  ))}
                </select>
                <MaterialIcon name="expand_more" size="sm" className={styles.selectChevron} />
              </div>

              {filtersActive ? (
                <button type="button" className={`${ui.btnGhost} focusRing`} onClick={clearFilters}>
                  <MaterialIcon name="filter_alt_off" size="sm" />
                  {t("qualityScore.analysis.clearFilters")}
                </button>
              ) : null}
            </div>

            <p className={styles.resultMeta} role="status">
              {t("qualityScore.analysis.showing", {
                from: filteredIssues.length === 0 ? 0 : 1,
                to: visibleIssues.length,
                total: filteredIssues.length,
              })}
            </p>

            {filteredIssues.length === 0 ? (
              <ReportState
                compact
                icon="filter_alt_off"
                title={t("qualityScore.analysis.noMatchesTitle")}
                body={t("qualityScore.analysis.noMatches")}
                actions={
                  <button type="button" className={`${ui.btn} focusRing`} onClick={clearFilters}>
                    {t("qualityScore.analysis.clearFilters")}
                  </button>
                }
              />
            ) : (
              <div className={`${ui.panel} ${styles.issueTable}`} role="table" aria-labelledby="iss-h">
                <div className={styles.issueHeadRow} role="row">
                  <span role="columnheader" className={ui.label}>
                    {t("qualityScore.severityLabel")}
                  </span>
                  <span role="columnheader" className={ui.label}>
                    {t("qualityScore.analysis.colCategory")}
                  </span>
                  <span role="columnheader" className={ui.label}>
                    {t("qualityScore.analysis.colIssue")}
                  </span>
                </div>
                {visibleIssues.map((issue, i) => (
                  <div key={`${issue.message}-${i}`} className={styles.issueRow} role="row">
                    <span role="cell" className={styles.cellSev}>
                      <span className={`${styles.sevChip} ${severityClass(issue.severity)}`}>
                        {t(`qualityScore.analysis.sev.${issue.severity}`)}
                      </span>
                    </span>
                    <span role="cell" className={styles.cellCat}>
                      <span className={styles.rule}>{t(CATEGORY_LABEL[issue.type] ?? issue.type)}</span>
                    </span>
                    <span role="cell" className={styles.cellIssue}>
                      <span className={styles.issueMsg}>{issue.message}</span>
                      {issue.example_fix ? (
                        <span className={styles.fix}>
                          <span className={`${ui.label} ${styles.fixK}`}>{t("qualityScore.exampleFix")}</span>
                          <code className={styles.fixCode}>{issue.example_fix}</code>
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {remaining > 0 ? (
              <div className={styles.moreRow}>
                <button
                  type="button"
                  className={`${ui.btn} focusRing`}
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  <MaterialIcon name="expand_more" size="sm" />
                  {t("qualityScore.analysis.loadMore", {
                    count: Math.min(PAGE_SIZE, remaining),
                  })}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {suggestions.length > 0 ? (
        <section className={`${ui.panel} ${styles.suggestions}`} aria-labelledby="sg-h">
          <div className={ui.panelHead}>
            <h2 id="sg-h" className={ui.label}>
              {t("qualityScore.suggestionsTitle")}
            </h2>
            <span className={`${ui.label} ${styles.num}`}>{suggestions.length}</span>
          </div>
          <ul className={styles.sugList}>
            {suggestions.map((s) => (
              <li key={s} className={styles.sugItem}>
                <MaterialIcon name="arrow_right_alt" size="sm" className={styles.sugIcon} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
