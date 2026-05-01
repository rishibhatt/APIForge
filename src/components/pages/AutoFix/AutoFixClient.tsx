"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import AutoFixTable from "@/components/AutoFixTable/AutoFixTable";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { readAnalysisPayload } from "@/lib/analysis-session";
import { generateFixes } from "@/lib/fixEngine";
import type { Endpoint } from "@/lib/fixEngine";
import { useLanguage } from "@/hooks/useLanguage";
import styles from "./AutoFixPage.module.css";

export default function AutoFixClient({ id }: { id: string }) {
  const { t } = useLanguage();
  const router = useRouter();

  const payload = useMemo(() => readAnalysisPayload(id), [id]);

  const endpoints: Endpoint[] = useMemo(() => {
    if (!payload?.endpoints?.length) return [];
    return payload.endpoints.map((e) => ({
      path: e.path,
      method: e.method,
    }));
  }, [payload]);

  const fixes = useMemo(() => generateFixes(endpoints), [endpoints]);

  const copyAll = useCallback(() => {
    const text = fixes
      .map((f) => {
        const from = `${f.originalMethod} ${f.original}`;
        const to = `${f.method} ${f.fixed}`;
        if (from === to) return to;
        return `${from}\n→ ${to}`;
      })
      .join("\n\n");
    void navigator.clipboard.writeText(text);
  }, [fixes]);

  const exportJson = useCallback(() => {
    const data = fixes.map((f) => ({
      original: `${f.originalMethod} ${f.original}`,
      fixed: `${f.method} ${f.fixed}`,
      originalPath: f.original,
      fixedPath: f.fixed,
      originalMethod: f.originalMethod,
      method: f.method,
      methodChanged: f.methodChanged,
      restCompliant: f.restCompliant,
      scoreBefore: f.scoreBefore,
      scoreAfter: f.scoreAfter,
      improvements: f.improvements,
      changes: f.changes,
      confidence: f.confidence,
      impact: f.impact,
      reason: f.reason,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apiforge-auto-fix-${id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [fixes, id]);

  const onBackAnalysis = useCallback(() => {
    router.push(`/analysis/${id}`);
  }, [router, id]);

  if (!payload) {
    return (
      <div className={styles.shell}>
        <LandingHeader t={t} minimal />
        <div className={styles.emptyWrap}>
          <p className={styles.emptyMsg}>{t("autoFix.missingSession")}</p>
          <Link href="/" className={`${styles.primaryBtn} focusRing`}>
            {t("qualityScore.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <LandingHeader t={t} minimal />

      <nav className={styles.dock} aria-label={t("autoFix.navAria")}>
        <button
          type="button"
          className={`${styles.backBtn} focusRing`}
          onClick={onBackAnalysis}
        >
          <MaterialIcon name="arrow_back" size="sm" aria-hidden />
          {t("autoFix.backAnalysis")}
        </button>
        <div className={styles.dockActions}>
          <button
            type="button"
            className={`${styles.actionBtn} focusRing`}
            onClick={() => copyAll()}
          >
            <MaterialIcon name="content_copy" size="sm" aria-hidden />
            {t("autoFix.copyAll")}
          </button>
          <button
            type="button"
            className={`${styles.actionBtnPrimary} focusRing`}
            onClick={exportJson}
          >
            <MaterialIcon name="download" size="sm" aria-hidden />
            {t("autoFix.exportJson")}
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{t("autoFix.eyebrow")}</p>
          <h1 className={styles.title}>{t("autoFix.title")}</h1>
          <p className={styles.subtitle}>{t("autoFix.subtitle")}</p>
          {payload.specTitle ? (
            <p className={styles.spec}>
              <span className={styles.specK}>{t("qualityScore.specLabel")}</span>{" "}
              {payload.specTitle}
            </p>
          ) : null}
        </header>

        {!endpoints.length ? (
          <div className={styles.noEp}>
            <p>{t("autoFix.noEndpoints")}</p>
            <p className={styles.noEpHint}>{t("autoFix.noEndpointsHint")}</p>
          </div>
        ) : (
          <section className={styles.card} aria-labelledby="auto-fix-table">
            <h2 id="auto-fix-table" className="srOnly">
              {t("autoFix.tableHeading")}
            </h2>
            <AutoFixTable t={t} fixes={fixes} />
          </section>
        )}
      </main>
    </div>
  );
}
