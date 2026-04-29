"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ApiIssue } from "@/lib/api-quality-score/types";
import { SCORE_CATEGORY_MAX } from "@/lib/api-quality-score/types";
import { readAnalysisPayload } from "@/lib/analysis-session";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import { useLanguage } from "@/hooks/useLanguage";
import styles from "./AnalysisDetail.module.css";

const BREAKDOWN_KEYS = [
  { key: "naming" as const, labelKey: "qualityScore.breakdown.naming" },
  { key: "http" as const, labelKey: "qualityScore.breakdown.http" },
  { key: "structure" as const, labelKey: "qualityScore.breakdown.structure" },
  {
    key: "consistency" as const,
    labelKey: "qualityScore.breakdown.consistency",
  },
  {
    key: "versioning" as const,
    labelKey: "qualityScore.breakdown.versioning",
  },
  {
    key: "errorHandling" as const,
    labelKey: "qualityScore.breakdown.errors",
  },
  {
    key: "documentation" as const,
    labelKey: "qualityScore.breakdown.docs",
  },
];

const CATEGORY_KEYS: { key: ApiIssue["type"]; labelKey: string }[] = [
  { key: "naming", labelKey: "qualityScore.breakdown.naming" },
  { key: "http", labelKey: "qualityScore.breakdown.http" },
  { key: "structure", labelKey: "qualityScore.breakdown.structure" },
  { key: "consistency", labelKey: "qualityScore.breakdown.consistency" },
  { key: "versioning", labelKey: "qualityScore.breakdown.versioning" },
  {
    key: "errorHandling",
    labelKey: "qualityScore.breakdown.errors",
  },
  { key: "documentation", labelKey: "qualityScore.breakdown.docs" },
];

const PAGE_SIZE = 50;

const SEVERITIES: ApiIssue["severity"][] = ["high", "medium", "low"];

function severityClass(sev: ApiIssue["severity"]): string {
  if (sev === "high") return styles.sevHigh;
  if (sev === "medium") return styles.sevMed;
  return styles.sevLow;
}

export default function AnalysisDetailClient({ id }: { id: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const payload = useMemo(() => readAnalysisPayload(id), [id]);

  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<Set<ApiIssue["severity"]>>(
    () => new Set(),
  );
  const [catFilter, setCatFilter] = useState<Set<ApiIssue["type"]>>(
    () => new Set(),
  );
  const [visible, setVisible] = useState(PAGE_SIZE);

  const normSearch = search.trim().toLowerCase();

  const filteredIssues = useMemo(() => {
    if (!payload) return [];
    let list = payload.result.issues;

    if (sevFilter.size > 0) {
      list = list.filter((i) => sevFilter.has(i.severity));
    }
    if (catFilter.size > 0) {
      list = list.filter((i) => catFilter.has(i.type));
    }
    if (normSearch.length > 0) {
      list = list.filter((i) => {
        const hay = `${i.message} ${i.example_fix}`.toLowerCase();
        return hay.includes(normSearch);
      });
    }
    return list;
  }, [payload, sevFilter, catFilter, normSearch]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [sevFilter, catFilter, normSearch]);

  const stats = useMemo(() => {
    const issues = filteredIssues;
    return {
      total: issues.length,
      high: issues.filter((i) => i.severity === "high").length,
      medium: issues.filter((i) => i.severity === "medium").length,
      low: issues.filter((i) => i.severity === "low").length,
    };
  }, [filteredIssues]);

  const visibleIssues = filteredIssues.slice(0, visible);
  const hasMore = visible < filteredIssues.length;

  const toggleSev = useCallback((s: ApiIssue["severity"]) => {
    setSevFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

  const toggleCat = useCallback((c: ApiIssue["type"]) => {
    setCatFilter((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSevFilter(new Set());
    setCatFilter(new Set());
  }, []);

  const onBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  if (!payload) {
    return (
      <div className={styles.shell}>
        <LandingHeader t={t} minimal />
        <div className={styles.emptyWrap}>
          <div className={styles.empty}>
            <p className={styles.emptyMsg}>{t("qualityScore.emptyAnalysis")}</p>
            <Link href="/" className={`${styles.primaryBtn} focusRing`}>
              {t("qualityScore.backHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { result, specTitle } = payload;
  const { totalScore, breakdown, issues, suggestions } = result;

  return (
    <div className={styles.shell}>
      <LandingHeader t={t} minimal />

      <nav className={styles.docDock} aria-label={t("qualityScore.analysis.navAria")}>
        <button
          type="button"
          className={`${styles.backBtn} focusRing`}
          onClick={onBack}
        >
          {t("qualityScore.analysis.back")}
        </button>
        <Link
          href={`/auto-fix/${id}`}
          className={`${styles.autoFixLink} focusRing`}
        >
          {t("autoFix.ctaFromAnalysis")}
        </Link>
      </nav>

      <main className={styles.main}>
        <section className={styles.heroBand}>
          <div className={styles.heroInner}>
            <div className={styles.heroScore}>
              <div className={styles.heroRow}>
                <span className={styles.heroNum}>{Math.round(totalScore)}</span>
                <span className={styles.heroSlash}>/100</span>
              </div>
              <p className={styles.heroEyebrow}>{t("qualityScore.analysis.heroEyebrow")}</p>
              <p className={styles.heroLead}>{t("qualityScore.analysis.heroLead")}</p>
              {specTitle ? (
                <p className={styles.heroSpec}>
                  <span className={styles.heroSpecK}>{t("qualityScore.specLabel")}</span>{" "}
                  {specTitle}
                </p>
              ) : null}
            </div>
            <div className={styles.heroMeta}>
              <div className={styles.statTile}>
                <span className={styles.statVal}>{issues.length}</span>
                <span className={styles.statLbl}>{t("qualityScore.analysis.rawIssues")}</span>
              </div>
              <div className={styles.statTile}>
                <span className={styles.statVal}>{filteredIssues.length}</span>
                <span className={styles.statLbl}>{t("qualityScore.analysis.filteredIssues")}</span>
              </div>
              <div className={styles.statMini}>
                <span>{t("qualityScore.analysis.statHigh")}: {stats.high}</span>
                <span>{t("qualityScore.analysis.statMed")}: {stats.medium}</span>
                <span>{t("qualityScore.analysis.statLow")}: {stats.low}</span>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.grid}>
          <section className={styles.breakdownCard} aria-labelledby="bd-h">
            <h2 id="bd-h" className={styles.cardTitle}>
              {t("qualityScore.breakdownTitle")}
            </h2>
            <ul className={styles.bdList}>
              {BREAKDOWN_KEYS.map(({ key, labelKey }) => {
                const earned = breakdown[key];
                const max = SCORE_CATEGORY_MAX[key];
                const pct = max > 0 ? Math.min(100, (earned / max) * 100) : 0;
                return (
                  <li key={key} className={styles.bdItem}>
                    <div className={styles.bdRow}>
                      <span>{t(labelKey)}</span>
                      <span className={styles.bdNums}>{earned}/{max}</span>
                    </div>
                    <div className={styles.track}>
                      <div className={styles.fill} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.filtersCard} aria-labelledby="fil-h">
            <h2 id="fil-h" className={styles.cardTitle}>
              {t("qualityScore.analysis.filtersTitle")}
            </h2>
            <label className={styles.searchLabel}>
              <span className="srOnly">{t("qualityScore.analysis.searchLabel")}</span>
              <input
                type="search"
                className={`${styles.searchInput} focusRing`}
                placeholder={t("qualityScore.analysis.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className={styles.filterBlock}>
              <span className={styles.filterK}>{t("qualityScore.analysis.severityFilter")}</span>
              <div className={styles.chips}>
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`${styles.chip} ${sevFilter.has(s) ? styles.chipOn : ""} focusRing`}
                    onClick={() => toggleSev(s)}
                  >
                    {t(`qualityScore.analysis.sev.${s}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.filterBlock}>
              <span className={styles.filterK}>{t("qualityScore.analysis.categoryFilter")}</span>
              <div className={styles.chipsWrap}>
                {CATEGORY_KEYS.map(({ key, labelKey }) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.chip} ${catFilter.has(key) ? styles.chipOn : ""} focusRing`}
                    onClick={() => toggleCat(key)}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className={`${styles.clearBtn} focusRing`}
              onClick={clearFilters}
            >
              {t("qualityScore.analysis.clearFilters")}
            </button>
          </section>
        </div>

        {suggestions.length > 0 ? (
          <section className={styles.suggestionsPanel} aria-labelledby="sg-h">
            <h2 id="sg-h" className={styles.sectionHeading}>
              {t("qualityScore.suggestionsTitle")}
            </h2>
            <ul className={styles.sugList}>
              {suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={styles.issueSection} aria-labelledby="iss-h">
          <div className={styles.issueHead}>
            <h2 id="iss-h" className={styles.sectionHeading}>
              {t("qualityScore.issuesTitle")}
            </h2>
            <p className={styles.issueMeta}>
              {t("qualityScore.analysis.showing", {
                from:
                  filteredIssues.length === 0
                    ? 0
                    : 1,
                to: visibleIssues.length,
                total: filteredIssues.length,
              })}
            </p>
          </div>

          {visibleIssues.length === 0 ? (
            <p className={styles.none}>{t("qualityScore.analysis.noMatches")}</p>
          ) : (
            <ul className={styles.issueFeed}>
              {visibleIssues.map((issue, i) => (
                <li key={`${issue.message}-${i}`} className={styles.issueCard}>
                  <div className={styles.issueCardTop}>
                    <span className={`${styles.pill} ${severityClass(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className={styles.issueType}>{issue.type}</span>
                  </div>
                  <p className={styles.issueMsg}>{issue.message}</p>
                  <p className={styles.fix}>
                    <span className={styles.fixK}>{t("qualityScore.exampleFix")}: </span>
                    {issue.example_fix}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {hasMore ? (
            <div className={styles.moreRow}>
              <button
                type="button"
                className={`${styles.loadMore} focusRing`}
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                {t("qualityScore.analysis.loadMore")}
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
