"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import RoastHero from "@/components/roast/RoastHero";
import RoastInput, { explainRoastError } from "@/components/roast/RoastInput";
import ChallengeBanner from "@/components/roast/ChallengeBanner";
import ChallengeResult from "@/components/roast/ChallengeResult";
import { toast } from "@/components/providers/Toaster/toast";
import RoastProgress from "@/components/roast/RoastProgress";
import RoastReport from "@/components/roast/RoastReport";
import RoastFinalCTA from "@/components/roast/RoastFinalCTA";
import RoastPreview from "@/components/roast/RoastPreview";
import { useRoastMotion } from "@/components/roast/useRoastMotion";
import shared from "@/components/roast/RoastSection.module.css";
import type { SanitizedRoastReport } from "@/lib/roast/types";
import { getRoastTextVariant } from "@/lib/roast/generateRoast";
import { persistAnalysisPayload } from "@/lib/analysis-session";
import { useLanguage } from "@/hooks/useLanguage";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./RoastPage.module.css";

type ViewState = "idle" | "analyzing" | "complete" | "error";

const PETSTORE_URL = "https://petstore.swagger.io/";

const REPORT_PARTS = [
  {
    title: "A score out of 100",
    body: "Seven rule-based categories: naming, HTTP semantics, structure, consistency, versioning, error handling and documentation.",
  },
  {
    title: "The worst offences",
    body: "Each one with the routes that commit it, why it matters and how to fix it.",
  },
  {
    title: "An auto-fix preview",
    body: "A projected score, then every proposed change in APIForge before you apply it.",
  },
  {
    title: "A roast, a meme, a card",
    body: "A roast written about your actual endpoints, a reaction clip, and a share card built for X and LinkedIn.",
  },
];

/** `beat` from a challenge link: an integer clamped to 0-100, or null when absent or not a number. */
function parseBeat(raw: string | null): number | null {
  if (raw === null) return null;
  const value = raw.trim();
  if (!/^\d{1,6}$/.test(value)) return null;
  return Math.min(100, Math.max(0, parseInt(value, 10)));
}

/** `from` from a challenge link: plain text, control characters dropped, trimmed, at most 60 chars. */
function parseFrom(raw: string | null): string {
  if (!raw) return "";
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

function isHttpUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return (u.protocol === "http:" || u.protocol === "https:") && Boolean(u.hostname);
  } catch {
    return false;
  }
}

function targetLabel(input: string): string {
  try {
    return new URL(input).host;
  } catch {
    return input;
  }
}

/** Below-the-fold content of the entry page. Its own component so the reveal hook re-binds each time it mounts. */
function IdleExplainer({ onRoastPetstore, onSupport }: { onRoastPetstore: () => void; onSupport: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useRoastMotion(ref);

  return (
    <div ref={ref}>
      <section className={styles.explainer} aria-labelledby="report-parts-title">
        <div className={styles.parts}>
          <h2 id="report-parts-title" className={styles.partsTitle} data-reveal>
            What comes back
          </h2>
          <dl className={styles.partsList} data-reveal-group>
            {REPORT_PARTS.map((part) => (
              <div key={part.title} className={styles.part} data-reveal-item>
                <dt>{part.title}</dt>
                <dd>{part.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.sample} data-reveal>
          <RoastPreview />
          <button type="button" className={shared.btnSecondary} onClick={onRoastPetstore}>
            Roast Petstore yourself
          </button>
        </div>
      </section>

      <RoastFinalCTA onSupport={onSupport} />
    </div>
  );
}

export default function RoastMyApiPageClient() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSpecUrl = searchParams.get("specUrl") || searchParams.get("url") || "";
  const beat = useMemo(() => parseBeat(searchParams.get("beat")), [searchParams]);
  const fromTitle = useMemo(() => parseFrom(searchParams.get("from")), [searchParams]);
  const toggleSupportModal = useWorkspaceStore((s) => s.toggleSupportModal);

  const [viewState, setViewState] = useState<ViewState>(initialSpecUrl ? "analyzing" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [report, setReport] = useState<SanitizedRoastReport | null>(null);
  const [endpointsState, setEndpointsState] = useState<{ path: string; method: string }[]>([]);
  const [activeUrl, setActiveUrl] = useState(initialSpecUrl);
  const [target, setTarget] = useState(initialSpecUrl ? targetLabel(initialSpecUrl) : "");
  const [variantIndex, setVariantIndex] = useState(0);
  const [isRoasting, setIsRoasting] = useState(false);
  const autoStarted = useRef(false);

  const runAnalysis = useCallback(async (init: RequestInit, fallbackError: string) => {
    setViewState("analyzing");
    setError(null);
    setErrorStatus(null);
    setReport(null);
    setVariantIndex(0);
    window.scrollTo({ top: 0 });

    const fail = (message: string, status: number | null) => {
      setError(message);
      setErrorStatus(status);
      setViewState("error");
      const info = explainRoastError(message, status);
      toast.error(info.title, { description: info.hint, id: "roast-analyze-error" });
    };

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      fail("You are offline", 0);
      return;
    }

    let res: Response;
    try {
      res = await fetch("/api/roast/analyze", { method: "POST", ...init });
    } catch {
      // The request never got a response: offline, DNS, or the server is down.
      fail("Network request failed", 0);
      return;
    }

    try {
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const message = typeof data.error === "string" && data.error ? data.error : fallbackError;
        fail(message, res.status);
        return;
      }
      setReport(data.report);
      setEndpointsState(Array.isArray(data.endpoints) ? data.endpoints : []);
    } catch (e) {
      fail(e instanceof Error ? e.message : fallbackError, res.status);
    }
  }, []);

  const startRoastUrl = useCallback(
    (url: string, authHeaders?: Record<string, string>) => {
      if (!isHttpUrl(url)) {
        setActiveUrl(url);
        setError("Invalid URL");
        setErrorStatus(null);
        setViewState("error");
        toast.error("That doesn't look like a valid URL", {
          description: "Start with https:// and use the full address of the spec.",
          id: "roast-analyze-error",
        });
        return;
      }
      setActiveUrl(url);
      setTarget(targetLabel(url));
      void runAnalysis(
        {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            authHeaders ? { url, tone: "brutal", headers: authHeaders } : { url, tone: "brutal" },
          ),
        },
        "Failed to analyze API specification",
      );
    },
    [runAnalysis],
  );

  const startRoastFile = useCallback(
    (file: File) => {
      setTarget(file.name);
      const form = new FormData();
      form.append("file", file);
      form.append("tone", "brutal");
      void runAnalysis({ body: form }, "Failed to analyze uploaded spec file");
    },
    [runAnalysis],
  );

  useEffect(() => {
    if (initialSpecUrl && !autoStarted.current) {
      autoStarted.current = true;
      startRoastUrl(initialSpecUrl);
    }
  }, [initialSpecUrl, startRoastUrl]);

  const handleProgressComplete = useCallback(() => {
    setViewState("complete");
    window.scrollTo({ top: 0 });
  }, []);

  const handleRoastAgain = useCallback(async () => {
    if (!report) return;
    const nextVariant = variantIndex + 1;
    setVariantIndex(nextVariant);
    setIsRoasting(true);

    try {
      const res = await fetch("/api/roast/variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: report.summary, variantIndex: nextVariant, title: report.title }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.roastText) {
        setReport({
          ...report,
          summary: {
            ...report.summary,
            roast: data.roastText,
            characterCount: data.characterCount,
            meme: report.summary.meme
              ? { ...report.summary.meme, caption: data.caption || report.summary.meme.caption }
              : undefined,
          },
        });
        return;
      }
    } catch {
      // Fall through to the local, rule-based variant.
    } finally {
      setIsRoasting(false);
    }

    const newRoastText = getRoastTextVariant(report.summary, nextVariant, { title: report.title });
    setReport({
      ...report,
      summary: { ...report.summary, roast: newRoastText, characterCount: newRoastText.length },
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

  const handleReset = () => {
    setViewState("idle");
    setReport(null);
    setError(null);
    setErrorStatus(null);
    setActiveUrl("");
    setVariantIndex(0);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className={`${styles.pageShell} roastZone`}>
      <LandingHeader t={t} minimal />

      <main className={styles.mainContent}>
        {viewState !== "complete" ? (
          <div hidden={viewState === "analyzing"}>
            <section className={styles.intro}>
              <RoastHero />
              {beat !== null ? <ChallengeBanner from={fromTitle} beat={beat} /> : null}
              <RoastInput
                initialUrl={activeUrl}
                error={error}
                errorStatus={errorStatus}
                onSubmitUrl={startRoastUrl}
                onFileUpload={startRoastFile}
              />
            </section>

            <IdleExplainer onRoastPetstore={() => startRoastUrl(PETSTORE_URL)} onSupport={toggleSupportModal} />
          </div>
        ) : null}

        {viewState === "analyzing" ? (
          <div className={styles.progressWrap}>
            <RoastProgress target={target} done={report !== null} onComplete={handleProgressComplete} />
          </div>
        ) : null}

        {viewState === "complete" && report && beat !== null ? (
          <ChallengeResult
            score={report.score}
            beat={beat}
            from={fromTitle}
            title={report.title}
            onRoastAnother={handleReset}
          />
        ) : null}

        {viewState === "complete" && report ? (
          <RoastReport
            report={report}
            variantNumber={variantIndex + 1}
            isRoasting={isRoasting}
            onRoastAgain={handleRoastAgain}
            onReset={handleReset}
            onOpenWorkspace={handleOpenWorkspace}
            onSupport={toggleSupportModal}
          />
        ) : null}
      </main>

      <LandingFooter t={t} />
    </div>
  );
}
