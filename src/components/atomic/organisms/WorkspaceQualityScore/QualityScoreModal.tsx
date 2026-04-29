"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import ScoreCard from "@/components/atomic/organisms/ApiQualityScoreCard/ScoreCard";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { persistAnalysisPayload } from "@/lib/analysis-session";
import { normalizeFromEndpoints } from "@/lib/api-quality-score/normalize-api-input";
import { calculateApiScore } from "@/lib/scoringEngine";
import type { TranslateFn } from "@/context/LanguageContext";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./QualityScoreModal.module.css";

export default function QualityScoreModal({ t }: { t: TranslateFn }) {
  const router = useRouter();
  const open = useWorkspaceStore((s) => s.qualityScoreModalOpen);
  const setOpen = useWorkspaceStore((s) => s.setQualityScoreModalOpen);
  const endpoints = useWorkspaceStore((s) => s.endpoints);
  const specTitle = useWorkspaceStore((s) => s.specTitle);
  const panelRef = useRef<HTMLDivElement>(null);

  const result = useMemo(() => {
    const rows = normalizeFromEndpoints(endpoints);
    return calculateApiScore(rows);
  }, [endpoints]);

  const onClose = useCallback(() => setOpen(false), [setOpen]);

  const onFullAnalysis = useCallback(() => {
    const id = persistAnalysisPayload({
      result,
      specTitle,
      createdAt: Date.now(),
      endpoints: endpoints.map((e) => ({
        path: e.path,
        method: e.method,
      })),
    });
    setOpen(false);
    router.push(`/analysis/${id}`);
  }, [result, specTitle, router, setOpen, endpoints]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const tmr = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => clearTimeout(tmr);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quality-score-dialog-title"
        tabIndex={-1}
      >
        <div className={styles.toolbar}>
          <h2 id="quality-score-dialog-title" className="srOnly">
            {t("qualityScore.title")}
          </h2>
          <button
            type="button"
            className={`${styles.closeBtn} focusRing`}
            onClick={onClose}
            aria-label={t("qualityScore.modalClose")}
          >
            <MaterialIcon name="close" size="md" />
          </button>
        </div>
        <div className={styles.cardWrap}>
          <ScoreCard
            t={t}
            result={result}
            variant="modal"
            onViewFullAnalysis={onFullAnalysis}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
