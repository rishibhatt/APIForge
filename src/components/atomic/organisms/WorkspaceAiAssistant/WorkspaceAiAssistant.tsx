"use client";

import { useCallback, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./WorkspaceAiAssistant.module.css";

export interface WorkspaceAssistantApiContext {
  specTitle: string;
  specVersion: string | null;
  endpointCount: number;
  activeTabLabel: string;
  scopeLabel: string;
  activeEndpointLine: string | null;
  activeSummary: string | null;
}

interface WorkspaceAiAssistantProps {
  t: TranslateFn;
  apiContext: WorkspaceAssistantApiContext;
  /** Layout tweaks when rendered inside the floating chat sheet */
  variant?: "default" | "sheet";
}

export default function WorkspaceAiAssistant({
  t,
  apiContext,
  variant = "default",
}: WorkspaceAiAssistantProps) {
  const [message, setMessage] = useState("");

  const presets = [
    t("workspace.assistant.preEndpoint"),
    t("workspace.assistant.preResponse"),
    t("workspace.assistant.preTypescript"),
    t("workspace.assistant.preErrors"),
  ] as const;

  const onPick = useCallback((text: string) => {
    setMessage(text);
  }, []);

  const versionSuffix =
    apiContext.specVersion && apiContext.specVersion.trim().length > 0
      ? t("workspace.assistant.contextVersionSuffix", {
          version: apiContext.specVersion.replace(/^v\s*/i, ""),
        })
      : "";

  const operationLine =
    apiContext.activeEndpointLine ??
    t("workspace.assistant.contextNoOperation");

  return (
    <section
      className={`${styles.wrap} ${variant === "sheet" ? styles.wrapSheet : ""}`}
      aria-label={t("workspace.assistant.aria")}
    >
      <div className={styles.context}>
        <p className={styles.contextKicker}>{t("workspace.assistant.contextHeading")}</p>
        <p className={styles.contextLine}>
          <span className={styles.contextLabel}>{t("workspace.assistant.contextSpec")}</span>
          {apiContext.specTitle}
          {versionSuffix}
        </p>
        <p className={styles.contextLine}>
          <span className={styles.contextLabel}>{t("workspace.assistant.contextEndpoints")}</span>
          {t("workspace.assistant.contextEndpointsValue", {
            count: apiContext.endpointCount,
          })}
        </p>
        <p className={styles.contextLine}>
          <span className={styles.contextLabel}>{t("workspace.assistant.contextOperation")}</span>
          {operationLine}
        </p>
        {apiContext.activeSummary ? (
          <p className={styles.contextSummary}>{apiContext.activeSummary}</p>
        ) : null}
        <p className={styles.contextLine}>
          <span className={styles.contextLabel}>{t("workspace.assistant.contextWorkspace")}</span>
          {t("workspace.assistant.contextWorkspaceValue", {
            tab: apiContext.activeTabLabel,
            scope: apiContext.scopeLabel,
          })}
        </p>
      </div>

      <div className={styles.head}>
        <MaterialIcon name="auto_awesome" size="sm" className={styles.headIcon} />
        <h2 className={styles.title}>{t("workspace.assistant.title")}</h2>
        <span className={styles.beta}>{t("workspace.assistant.beta")}</span>
      </div>
      <p className={styles.lead}>{t("workspace.assistant.lead")}</p>
      <div className={styles.chips} role="group">
        {presets.map((label) => (
          <button
            key={label}
            type="button"
            className={`${styles.chip} focusRing`}
            onClick={() => onPick(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.inputWrap}>
        <label htmlFor="workspace-assistant-input" className="srOnly">
          {t("workspace.assistant.placeholder")}
        </label>
        <textarea
          id="workspace-assistant-input"
          className={styles.input}
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("workspace.assistant.placeholder")}
          spellCheck={false}
        />
        <button
          type="button"
          className={styles.send}
          aria-label={t("workspace.assistant.sendAria")}
          disabled
          title={t("workspace.assistant.sendDisabled")}
        >
          <MaterialIcon name="send" size="sm" />
        </button>
      </div>
      <p className={styles.disclaimer}>{t("workspace.assistant.disclaimer")}</p>
    </section>
  );
}
