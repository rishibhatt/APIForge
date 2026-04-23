"use client";

import { useRef } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./HeroSection.module.css";

export interface HeroSectionProps {
  t: TranslateFn;
  isLoading: boolean;
  error: string | null;
  onForge: () => void;
  onParseFile: (file: File) => void;
}

export default function HeroSection({
  t,
  isLoading,
  error,
  onForge,
  onParseFile,
}: HeroSectionProps) {
  const specUrlInput = useWorkspaceStore((s) => s.specUrlInput);
  const setSpecUrlInput = useWorkspaceStore((s) => s.setSpecUrlInput);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onParseFile(file);
    e.target.value = "";
  };

  return (
    <section className={styles.hero} id="parse-api">
      <div className={styles.heroGradient} aria-hidden />
      <div className={styles.gridSubtle} aria-hidden />

      <div className={styles.inner}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} aria-hidden />
          <span className={styles.badgeText}>{t("landing.engineBadge")}</span>
        </div>

        <h1 className={styles.title}>
          <span className={styles.titleLine}>{t("landing.titleLine1")}</span>
          <br />
          <span className={styles.titleGradient}>{t("landing.titleLine2")}</span>
        </h1>

        <p className={styles.subtitle}>{t("landing.subtitle")}</p>

        <div className={styles.inputCanvas}>
          <div className={styles.inputRow}>
            <div className={styles.inputWrap}>
              <MaterialIcon
                name="link"
                className={styles.linkIcon}
                size="md"
              />
              <label htmlFor="landing-forge-url" className="srOnly">
                {t("hero.inputPlaceholder")}
              </label>
              <input
                id="landing-forge-url"
                type="url"
                name="url"
                autoComplete="url"
                placeholder={t("landing.inputPlaceholder")}
                className={`${styles.input} focusRing`}
                value={specUrlInput}
                onChange={(e) => setSpecUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onForge();
                }}
              />
            </div>
            <button
              type="button"
              className={`${styles.parseBtn} focusRing`}
              onClick={onForge}
              disabled={isLoading}
            >
              {isLoading ? t("common.loading") : t("landing.parseCta")}
              {!isLoading ? (
                <MaterialIcon name="bolt" className={styles.parseIcon} size="sm" />
              ) : null}
            </button>
          </div>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.supporting}>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.yaml,.yml,application/json,text/yaml"
            className="srOnly"
            aria-label={t("landing.uploadJson")}
            onChange={onFileChange}
          />
          <button
            type="button"
            className={`${styles.uploadBtn} focusRing`}
            onClick={() => fileRef.current?.click()}
            disabled={isLoading}
          >
            <MaterialIcon
              name="upload_file"
              className={styles.uploadIcon}
              size="md"
            />
            <span>{t("landing.uploadJson")}</span>
          </button>

          <div className={styles.supportsRow}>
            <span className={styles.supportsLabel}>{t("landing.supports")}</span>
            <div className={styles.supportsTags}>
              <span className={styles.tagPrimary}>{t("landing.tagOpenApi")}</span>
              <span className={styles.tagMuted}>{t("landing.tagSwagger")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.decorLeft} aria-hidden>
        <div className={styles.gaugeBlock}>
          <span className={styles.gaugeLabel}>{t("landing.latency")}</span>
          <div className={styles.gaugeTrack}>
            <div className={styles.gaugeFillLatency} />
          </div>
        </div>
        <div className={styles.gaugeBlock}>
          <span className={styles.gaugeLabel}>{t("landing.throughput")}</span>
          <div className={styles.gaugeTrack}>
            <div className={styles.gaugeFillThroughput} />
          </div>
        </div>
      </div>

      <div className={styles.decorRight} aria-hidden>
        <div className={styles.uptimeValue}>{t("landing.uptimeValue")}</div>
        <div className={styles.uptimeLabel}>{t("landing.uptimeLabel")}</div>
      </div>
    </section>
  );
}
