"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import RoastScore from "@/components/roast/RoastScore";
import RoastCard from "@/components/roast/RoastCard";
import RoastFindings from "@/components/roast/RoastFindings";
import RoastStrengths from "@/components/roast/RoastStrengths";
import RoastMemeVideo from "@/components/roast/RoastMemeVideo";
import RoastShare from "@/components/roast/RoastShare";
import type { SanitizedRoastReport } from "@/lib/roast/types";
import { useLanguage } from "@/hooks/useLanguage";
import styles from "@/app/roast-my-api/RoastPage.module.css";

export default function PublicRoastClient({ reportId }: { reportId: string }) {
  const { t } = useLanguage();
  const [report, setReport] = useState<SanitizedRoastReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Moderation state
  const [moderationOpen, setModerationOpen] = useState(false);
  const [moderationReason, setModerationReason] = useState("offensive");
  const [moderationSubmitted, setModerationSubmitted] = useState(false);
  const [moderationLoading, setModerationLoading] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/roast/${reportId}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Report not found");
        }
        setReport(data.report);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load roast report");
      } finally {
        setLoading(false);
      }
    }
    void fetchReport();
  }, [reportId]);

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
      setModerationSubmitted(true);
    } finally {
      setModerationLoading(false);
    }
  };

  return (
    <div className={styles.pageShell}>
      <LandingHeader t={t} minimal />

      <main className={styles.mainContent}>
        {loading ? (
          <div style={{ padding: "5rem 1.5rem", textAlign: "center", color: "#a1a1aa" }}>
            Loading roast report...
          </div>
        ) : error || !report ? (
          <div style={{ padding: "5rem 1.5rem", textAlign: "center", color: "#ff6b4a" }}>
            <h2>Roast Report Not Found</h2>
            <p style={{ marginTop: "0.5rem", color: "#a1a1aa" }}>{error || "This report may have expired or is invalid."}</p>
            <Link
              href="/roast-my-api"
              className={styles.finalCtaBtn}
              style={{ marginTop: "1.5rem", textDecoration: "none" }}
            >
              ROAST YOUR API
            </Link>
          </div>
        ) : (
          <div className={styles.resultContainer}>
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  color: "#ff6b4a",
                  textTransform: "uppercase",
                  background: "rgba(255, 107, 74, 0.12)",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(255, 107, 74, 0.3)",
                }}
              >
                PUBLIC ROAST REPORT
              </span>
            </div>

            <RoastScore
              score={report.summary.score}
              statusTier={report.summary.statusTier}
              verdict={report.summary.verdict}
              totalEndpoints={report.summary.totalEndpoints}
              totalFindings={report.summary.totalFindings}
              patternsCount={report.summary.topPatterns.length}
            />

            <RoastMemeVideo summary={report.summary} />

            <RoastCard
              roastText={report.summary.roast}
              characterCount={report.summary.characterCount}
              onOpenShare={() => setShareOpen(true)}
            />

            <RoastFindings patterns={report.summary.topPatterns} />

            <RoastStrengths strengths={report.summary.strengths} />

            <div className={styles.finalCtaSection}>
              <h2 className={styles.finalCtaHeading}>THINK YOUR API CAN DO BETTER?</h2>
              <div className={styles.finalCtaSub}>ROAST YOURS</div>
              <Link href="/roast-my-api" className={styles.finalCtaBtn}>
                ROAST MY API
              </Link>
              <div className={styles.finalCtaFooterText}>
                Audit your OpenAPI spec with APIForge&apos;s deterministic quality engine.
              </div>
            </div>

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
        )}

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

      <LandingFooter t={t} />
    </div>
  );
}
