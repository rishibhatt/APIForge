"use client";

import Link from "next/link";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { TranslateFn } from "@/context/LanguageContext";
import { workspaceHref } from "@/lib/analysis-session";
import { ReportState, reportStyles as ui } from "./ReportChrome";

/** Shared by the analysis and auto-fix pages when the session-storage payload is gone. */
export default function MissingSession({ t, specUrl }: { t: TranslateFn; specUrl: string | null }) {
  return (
    <ReportState
      icon="history"
      tone="warning"
      title={t("qualityScore.analysis.missingTitle")}
      body={
        specUrl
          ? t("qualityScore.analysis.missingBody")
          : t("qualityScore.analysis.missingBodyNoSpec")
      }
      actions={
        specUrl ? (
          <>
            <Link href={workspaceHref(specUrl)} className={`${ui.btnPrimary} focusRing`}>
              <MaterialIcon name="refresh" size="sm" />
              {t("qualityScore.analysis.reopenSpec")}
            </Link>
            <Link href="/" className={`${ui.btnGhost} focusRing`}>
              {t("qualityScore.backHome")}
            </Link>
          </>
        ) : (
          <Link href="/" className={`${ui.btnPrimary} focusRing`}>
            {t("qualityScore.analysis.openWorkspace")}
          </Link>
        )
      }
    />
  );
}
