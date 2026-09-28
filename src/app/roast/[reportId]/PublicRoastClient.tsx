"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
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
import { adaptRoastSummaryToPresentation } from "@/lib/roast/presentationAdapter";
import { useLanguage } from "@/hooks/useLanguage";
import styles from "@/app/roast-my-api/RoastPage.module.css";

export default function PublicRoastClient({ reportId }: { reportId: string }) {
  const { t } = useLanguage();
  const [report, setReport] = useState<SanitizedRoastReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

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

            {(() => {
              const presentation = adaptRoastSummaryToPresentation(report.summary);
              return (
                <>
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
                  <AutoFixVerdict score={report.summary.score} />

                  {/* 09 - FINAL CTA */}
                  <RoastFinalCTA onReset={() => (window.location.href = "/roast-my-api")} />
                </>
              );
            })()}
          </div>
        )}

        {shareOpen && report ? (
          <RoastShare report={report} onClose={() => setShareOpen(false)} />
        ) : null}
      </main>

      <LandingFooter t={t} />
    </div>
  );
}
