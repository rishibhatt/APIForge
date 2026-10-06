"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import AutoFixTable from "@/components/AutoFixTable/AutoFixTable";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import {
  useAnalysisSession,
  useWorkspaceReturnHref,
  withSpecQuery,
} from "@/lib/analysis-session";
import { generateFixes } from "@/lib/fixEngine";
import type { Endpoint } from "@/lib/fixEngine";
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

function feedbackClass(state: "idle" | "done" | "failed"): string {
  if (state === "done") return ui.btnDone ?? "";
  if (state === "failed") return ui.btnFailed ?? "";
  return "";
}

export default function AutoFixClient({ id }: { id: string }) {
  const { t } = useLanguage();
  const session = useAnalysisSession(id);
  const backHref = useWorkspaceReturnHref(session.specUrl);
  const payload = session.status === "ready" ? session.payload : null;

  const endpoints: Endpoint[] = useMemo(() => {
    if (!payload?.endpoints?.length) return [];
    return payload.endpoints.map((e) => ({ path: e.path, method: e.method }));
  }, [payload]);

  const fixes = useMemo(() => generateFixes(endpoints), [endpoints]);

  const changedCount = useMemo(
    () =>
      fixes.filter((f) => f.original !== f.fixed || f.methodChanged).length,
    [fixes],
  );

  const [copyState, flashCopy] = useFlash();
  const [exportState, flashExport] = useFlash();

  const copyAll = useCallback(async () => {
    const text = fixes
      .map((f) => {
        const from = `${f.originalMethod} ${f.original}`;
        const to = `${f.method} ${f.fixed}`;
        return from === to ? to : `${from}\n→ ${to}`;
      })
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      flashCopy("done");
    } catch {
      flashCopy("failed");
    }
  }, [fixes, flashCopy]);

  const exportJson = useCallback(() => {
    try {
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
      flashExport("done");
    } catch {
      flashExport("failed");
    }
  }, [fixes, id, flashExport]);

  const crumbsAria = t("qualityScore.analysis.crumbsAria");
  const title = t("autoFix.title");
  const analysisHref = withSpecQuery(`/analysis/${id}`, session.specUrl);

  if (session.status === "loading") {
    return (
      <ReportLayout t={t}>
        <ReportSkeleton label={t("autoFix.loading")} />
      </ReportLayout>
    );
  }

  const crumbs = [
    { label: t("qualityScore.analysis.crumbWorkspace"), href: backHref },
    { label: t("qualityScore.analysis.pageTitle"), href: payload ? analysisHref : undefined },
    { label: title },
  ];

  if (!payload) {
    return (
      <ReportLayout t={t}>
        <ReportBreadcrumbs ariaLabel={crumbsAria} crumbs={crumbs} />
        <MissingSession t={t} specUrl={session.specUrl} />
      </ReportLayout>
    );
  }

  const hasFixes = fixes.length > 0;

  return (
    <ReportLayout t={t}>
      <ReportBreadcrumbs ariaLabel={crumbsAria} crumbs={crumbs} />
      <ReportHeader
        title={title}
        description={t("autoFix.subtitle")}
        meta={
          <>
            {payload.specTitle ? (
              <span className={ui.metaItem}>
                <span className={ui.metaKey}>{t("qualityScore.specLabel")}</span>
                <span className={ui.metaValue} title={session.specUrl ?? undefined}>
                  {payload.specTitle}
                </span>
              </span>
            ) : null}
            {hasFixes ? (
              <span className={ui.metaItem}>
                {t("autoFix.summaryMeta", {
                  changed: changedCount,
                  total: fixes.length,
                })}
              </span>
            ) : null}
          </>
        }
        actions={
          hasFixes ? (
            <>
              <button
                type="button"
                className={`${ui.btn} ${feedbackClass(exportState)} focusRing`}
                onClick={exportJson}
              >
                <MaterialIcon
                  name={exportState === "done" ? "check" : exportState === "failed" ? "error" : "download"}
                  size="sm"
                />
                <span aria-live="polite">
                  {exportState === "done"
                    ? tx(t, "autoFix.exported", "Downloaded")
                    : exportState === "failed"
                      ? tx(t, "autoFix.exportFailed", "Export failed")
                      : t("autoFix.exportJson")}
                </span>
              </button>
              <button
                type="button"
                className={`${copyState === "idle" ? ui.btnPrimary : ui.btn} ${feedbackClass(copyState)} focusRing`}
                onClick={() => void copyAll()}
              >
                <MaterialIcon
                  name={copyState === "done" ? "check" : copyState === "failed" ? "error" : "content_copy"}
                  size="sm"
                />
                <span aria-live="polite">
                  {copyState === "done"
                    ? t("autoFix.copied")
                    : copyState === "failed"
                      ? t("autoFix.copyFailed")
                      : t("autoFix.copyAll")}
                </span>
              </button>
            </>
          ) : null
        }
      />

      {!endpoints.length ? (
        <ReportState
          icon="route"
          title={t("autoFix.noEndpoints")}
          body={t("autoFix.noEndpointsHint")}
          actions={
            <Link href={backHref} className={`${ui.btnPrimary} focusRing`}>
              {t("qualityScore.analysis.backToWorkspace")}
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="auto-fix-table">
          <h2 id="auto-fix-table" className="srOnly">
            {t("autoFix.tableHeading")}
          </h2>
          {hasFixes && changedCount === 0 ? (
            <div className={ui.noticeGap}>
              <ReportState
                compact
                tone="success"
                icon="task_alt"
                title={tx(t, "autoFix.nothingToFixTitle", "Nothing to fix")}
                body={tx(
                  t,
                  "autoFix.nothingToFixBody",
                  "Every endpoint already follows REST-style paths and methods. The table below lists them for reference.",
                )}
              />
            </div>
          ) : null}
          <AutoFixTable t={t} fixes={fixes} />
        </section>
      )}
    </ReportLayout>
  );
}
