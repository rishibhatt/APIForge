"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import FloatingSupportButton from "@/components/atomic/atoms/FloatingSupportButton/FloatingSupportButton";
import SupportModal from "@/components/atomic/organisms/SupportModal/SupportModal";
import RoastHero from "@/components/roast/RoastHero";
import RoastInput from "@/components/roast/RoastInput";
import RoastProgress from "@/components/roast/RoastProgress";
import RoastScore from "@/components/roast/RoastScore";
import RoastCard from "@/components/roast/RoastCard";
import DamageSnapshot from "@/components/roast/DamageSnapshot";
import RoastOffences from "@/components/roast/RoastOffences";
import RoastTechnicalDetails from "@/components/roast/RoastTechnicalDetails";
import RoastStrengths from "@/components/roast/RoastStrengths";
import AutoFixVerdict from "@/components/roast/AutoFixVerdict";
import RoastFinalCTA from "@/components/roast/RoastFinalCTA";
import RoastMemeVideo from "@/components/roast/RoastMemeVideo";
import RoastShare from "@/components/roast/RoastShare";
import type { SanitizedRoastReport } from "@/lib/roast/types";
import { getRoastTextVariant } from "@/lib/roast/generateRoast";
import { adaptRoastSummaryToPresentation } from "@/lib/roast/presentationAdapter";
import { persistAnalysisPayload } from "@/lib/analysis-session";
import { useLanguage } from "@/hooks/useLanguage";
import styles from "./RoastPage.module.css";

type ViewState = "idle" | "analyzing" | "complete" | "error";

export default function RoastMyApiPageClient() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSpecUrl = searchParams.get("specUrl") || searchParams.get("url") || "";

  const [viewState, setViewState] = useState<ViewState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SanitizedRoastReport | null>(null);
  const [endpointsState, setEndpointsState] = useState<{ path: string; method: string }[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeUrl, setActiveUrl] = useState(initialSpecUrl);
  const [variantIndex, setVariantIndex] = useState(0);

  // Moderation state
  const [moderationOpen, setModerationOpen] = useState(false);
  const [moderationReason, setModerationReason] = useState("offensive");
  const [moderationSubmitted, setModerationSubmitted] = useState(false);
  const [moderationLoading, setModerationLoading] = useState(false);

  const startRoastUrl = useCallback(async (url: string) => {
    setViewState("analyzing");
    setError(null);
    setActiveUrl(url);
    setVariantIndex(0);

    try {
      const res = await fetch("/api/roast/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tone: "brutal" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze API specification");
      }

      setReport(data.report);
      if (Array.isArray(data.endpoints)) {
        setEndpointsState(data.endpoints);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Roast failed";
      setError(msg);
      setViewState("error");
    }
  }, []);

  const startRoastFile = useCallback(async (file: File) => {
    setViewState("analyzing");
    setError(null);
    setVariantIndex(0);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tone", "brutal");

      const res = await fetch("/api/roast/analyze", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze uploaded spec file");
      }

      setReport(data.report);
      if (Array.isArray(data.endpoints)) {
        setEndpointsState(data.endpoints);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Roast failed";
      setError(msg);
      setViewState("error");
    }
  }, []);

  const handleRoastAgain = useCallback(async () => {
    if (!report) return;
    const nextVariant = variantIndex + 1;
    setVariantIndex(nextVariant);

    try {
      const res = await fetch("/api/roast/variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: report.summary, variantIndex: nextVariant }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.roastText) {
        setReport({
          ...report,
          summary: {
            ...report.summary,
            roast: data.roastText,
            characterCount: data.characterCount,
            meme: report.summary.meme ? {
              ...report.summary.meme,
              caption: data.caption || report.summary.meme.caption,
            } : undefined,
          },
        });
        return;
      }
    } catch {
      // fallback to structural generator
    }

    const newRoastText = getRoastTextVariant(report.summary, nextVariant);
    setReport({
      ...report,
      summary: {
        ...report.summary,
        roast: newRoastText,
        characterCount: newRoastText.length,
      },
    });
  }, [report, variantIndex]);

  const handleOpenWorkspace = useCallback(() => {
    if (!report) return;
    const payloadId = persistAnalysisPayload({
      result: {
        totalScore: report.score,
        breakdown: {
          naming: report.breakdown.naming ?? 15,
          http: report.breakdown.http ?? 15,
          structure: report.breakdown.structure ?? 15,
          consistency: report.breakdown.consistency ?? 15,
          versioning: report.breakdown.versioning ?? 10,
          errorHandling: report.breakdown.errorHandling ?? 15,
          documentation: report.breakdown.documentation ?? 15,
        },
        issues: [],
        suggestions: report.suggestions || [],
      },
      specTitle: report.title,
      createdAt: Date.now(),
      endpoints: endpointsState.length > 0 ? endpointsState : undefined,
    });
    router.push(`/auto-fix/${payloadId}`);
  }, [report, endpointsState, router]);

  useEffect(() => {
    if (initialSpecUrl && viewState === "idle") {
      void startRoastUrl(initialSpecUrl);
    }
  }, [initialSpecUrl, viewState, startRoastUrl]);

  const handleAnimationComplete = () => {
    if (report) {
      setViewState("complete");
    }
  };

  const handleReset = () => {
    setViewState("idle");
    setReport(null);
    setError(null);
    setActiveUrl("");
    setVariantIndex(0);
  };

  const handleReportSubmit = async () => {
    if (!report) return;
    setModerationLoading(true);
    try {
      await fetch("/api/roast/report-moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          reason: moderationReason,
          roastText: report.summary.roast,
        }),
      });
      setModerationSubmitted(true);
    } catch {
      // Fallback grace
      setModerationSubmitted(true);
    } finally {
      setModerationLoading(false);
    }
  };

  return (
    <div className={styles.pageShell}>
      <LandingHeader t={t} minimal />

      <main className={styles.mainContent}>
        {viewState === "idle" || viewState === "error" ? (
          <>
            <RoastHero onSelectDemo={(url) => void startRoastUrl(url)} />
            <RoastInput
              initialUrl={activeUrl}
              isLoading={false}
              error={error}
              onSubmitUrl={(url) => void startRoastUrl(url)}
              onFileUpload={(file) => void startRoastFile(file)}
            />
          </>
        ) : null}

        {viewState === "analyzing" ? (
          <div className={styles.progressWrap}>
            <RoastProgress
              endpointsCount={report?.endpointsCount}
              onComplete={handleAnimationComplete}
            />
          </div>
        ) : null}

        {viewState === "complete" && report ? (() => {
          const presentation = adaptRoastSummaryToPresentation(report.summary);
          return (
            <div className={styles.resultContainer}>
              {/* 01 - JUDGEMENT */}
              <RoastScore
                score={report.summary.score}
                statusTier={report.summary.statusTier}
                verdict={report.summary.verdict}
                totalEndpoints={report.summary.totalEndpoints}
                totalFindings={report.summary.totalFindings}
                patternsCount={report.summary.topPatterns.length}
              />

              {/* 02 - MEME MOMENT */}
              <RoastMemeVideo summary={report.summary} />

              {/* 03 - ROAST STATEMENT */}
              <RoastCard
                roastText={report.summary.roast}
                characterCount={report.summary.characterCount}
                variantNumber={variantIndex + 1}
                onRoastAgain={handleRoastAgain}
                onOpenShare={() => setShareOpen(true)}
              />

              {/* 04 - DAMAGE SNAPSHOT */}
              <DamageSnapshot
                metrics={presentation.metrics}
                heatmap={presentation.heatmap}
              />

              {/* 05 - BIGGEST OFFENCES */}
              <RoastOffences offences={presentation.offences} />

              {/* 06 - DEEP DIVE */}
              <RoastTechnicalDetails
                summary={report.summary}
                breakdown={report.breakdown}
                suggestions={report.suggestions}
              />

              {/* 07 - WHAT YOU ACTUALLY DID RIGHT */}
              <RoastStrengths
                strengths={report.summary.strengths}
                totalFindings={report.summary.totalFindings}
              />

              {/* 08 - THERE IS HOPE */}
              <AutoFixVerdict
                score={report.summary.score}
                onReset={handleReset}
                onOpenWorkspace={handleOpenWorkspace}
              />

              {/* 09 - FINAL CTA */}
              <RoastFinalCTA
                onReset={handleReset}
                onOpenWorkspace={handleOpenWorkspace}
              />

              <div className={styles.reportModerationBar}>
                <button
                  type="button"
                  className={styles.reportModerationTrigger}
                  onClick={() => {
                    setModerationSubmitted(false);
                    setModerationOpen(true);
                  }}
                >
                  Report this roast
                </button>
              </div>
            </div>
          );
        })() : null}

        {shareOpen && report ? (
          <RoastShare report={report} onClose={() => setShareOpen(false)} />
        ) : null}

        {moderationOpen ? (
          <div className={styles.modalOverlay} onClick={() => setModerationOpen(false)}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>REPORT THIS ROAST</h3>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setModerationOpen(false)}
                >
                  ✕
                </button>
              </div>

              {moderationSubmitted ? (
                <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#a1a1aa" }}>
                  <p style={{ color: "#22c55e", fontWeight: 700, marginBottom: "0.5rem" }}>
                    Report received.
                  </p>
                  <p style={{ fontSize: "0.85rem" }}>
                    Thank you for helping us keep Roast My API respectful and accurate.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "0.85rem", color: "#96939d", marginBottom: "1.2rem" }}>
                    Why are you reporting this roast output?
                  </p>

                  <label className={styles.reasonOption}>
                    <input
                      type="radio"
                      name="reason"
                      value="offensive"
                      checked={moderationReason === "offensive"}
                      onChange={(e) => setModerationReason(e.target.value)}
                    />
                    <span>Roast is offensive or attacks identity</span>
                  </label>

                  <label className={styles.reasonOption}>
                    <input
                      type="radio"
                      name="reason"
                      value="incorrect"
                      checked={moderationReason === "incorrect"}
                      onChange={(e) => setModerationReason(e.target.value)}
                    />
                    <span>Roast contains incorrect technical information</span>
                  </label>

                  <label className={styles.reasonOption}>
                    <input
                      type="radio"
                      name="reason"
                      value="sensitive"
                      checked={moderationReason === "sensitive"}
                      onChange={(e) => setModerationReason(e.target.value)}
                    />
                    <span>Roast exposes sensitive or confidential data</span>
                  </label>

                  <label className={styles.reasonOption}>
                    <input
                      type="radio"
                      name="reason"
                      value="other"
                      checked={moderationReason === "other"}
                      onChange={(e) => setModerationReason(e.target.value)}
                    />
                    <span>Something else</span>
                  </label>

                  <button
                    type="button"
                    className={styles.finalCtaBtn}
                    style={{ width: "100%", marginTop: "1rem" }}
                    disabled={moderationLoading}
                    onClick={handleReportSubmit}
                  >
                    {moderationLoading ? "SUBMITTING..." : "SUBMIT REPORT"}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <FloatingSupportButton t={t} />
      <SupportModal t={t} />
      <LandingFooter t={t} />
    </div>
  );
}
