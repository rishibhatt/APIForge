"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import ScoreCard from "@/components/atomic/organisms/ApiQualityScoreCard/ScoreCard";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { persistAnalysisPayload, withSpecQuery } from "@/lib/analysis-session";
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

  const persistAndGo = useCallback(
    (target: "analysis" | "auto-fix") => {
      const id = persistAnalysisPayload({
        result,
        specTitle,
        createdAt: Date.now(),
        endpoints: endpoints.map((e) => ({
          path: e.path,
          method: e.method,
        })),
      });
      const specUrl = useWorkspaceStore.getState().specUrlInput;
      setOpen(false);
      router.push(target === "auto-fix" ? withSpecQuery(`/auto-fix/${id}`, specUrl) : `/analysis/${id}`);
    },
    [result, specTitle, router, setOpen, endpoints],
  );
  const onFullAnalysis = useCallback(() => persistAndGo("analysis"), [persistAndGo]);
  const onPreviewAutoFix = useCallback(() => persistAndGo("auto-fix"), [persistAndGo]);

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
    // Remember the opener so focus returns to it when the dialog closes.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
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
            titleId="quality-score-dialog-title"
            onPreviewAutoFix={onPreviewAutoFix}
            onRoastApi={() => {
              const specUrl = useWorkspaceStore.getState().specUrlInput;
              setOpen(false);
              if (specUrl) {
                router.push(`/roast-my-api?specUrl=${encodeURIComponent(specUrl)}`);
              } else {
                router.push("/roast-my-api");
              }
            }}
            onViewFullAnalysis={onFullAnalysis}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
