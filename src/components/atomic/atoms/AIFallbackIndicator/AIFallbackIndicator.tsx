"use client";

import React, { useState } from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./AIFallbackIndicator.module.css";

interface AIFallbackIndicatorProps {
  className?: string;
  loading?: boolean;
  statusMessage?: string | null;
}

export default function AIFallbackIndicator({
  className = "",
  loading = false,
  statusMessage = null,
}: AIFallbackIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const lastAiModel = useWorkspaceStore((s) => s.lastAiModel);
  const lastAiProvider = useWorkspaceStore((s) => s.lastAiProvider);
  const lastAiFallbackUsed = useWorkspaceStore((s) => s.lastAiFallbackUsed);
  const lastMs = useWorkspaceStore((s) => s.lastGenerationMs);

  if (loading && statusMessage) {
    return (
      <div className={`${styles.container} ${styles.loadingState} ${className}`}>
        <div className={styles.spinner}>
          <div className={styles.spinnerInner} />
        </div>
        <span className={styles.loadingText}>{statusMessage}</span>
      </div>
    );
  }

  if (!lastAiModel && !lastAiProvider) {
    return null;
  }

  const cleanModelName = (lastAiModel || "Model").split("/").pop()?.replace(":free", "") || lastAiModel;
  const providerName = lastAiProvider || "AI Gateway";

  return (
    <div
      className={`${styles.container} ${lastAiFallbackUsed ? styles.fallbackState : styles.activeState} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={styles.badge}>
        <span className={styles.icon}>⚡</span>
        <span className={styles.modelName}>{cleanModelName}</span>
        <span className={styles.divider}>•</span>
        <span className={styles.providerName}>{providerName}</span>
        {lastAiFallbackUsed ? (
          <span className={styles.fallbackPill}>Auto-Routed</span>
        ) : null}
      </div>

      {showTooltip ? (
        <div className={styles.tooltip}>
          <div className={styles.tooltipHeader}>
            <span className={styles.tooltipTitle}>
              {lastAiFallbackUsed ? "⚡ Failover Route Engaged" : "✓ Active AI Route"}
            </span>
            {lastMs ? <span className={styles.tooltipLatency}>{lastMs}ms</span> : null}
          </div>
          <p className={styles.tooltipBody}>
            {lastAiFallbackUsed
              ? `Primary model was busy or unavailable. Automatically routed to ${cleanModelName} via ${providerName} without interruption.`
              : `Serving direct inferences on ${cleanModelName} via high-speed ${providerName}.`}
          </p>
          <div className={styles.tooltipFooter}>
            <span className={styles.modelDetail}>{lastAiModel}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
