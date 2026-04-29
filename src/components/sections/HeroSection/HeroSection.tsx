"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import LandingMarquee from "@/components/sections/LandingMarquee/LandingMarquee";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./HeroSection.module.css";

export interface HeroSectionProps {
  t: TranslateFn;
  isLoading: boolean;
  error: string | null;
  onForge: () => void;
}

export default function HeroSection({
  t,
  isLoading,
  error,
  onForge,
}: HeroSectionProps) {
  const specUrlInput = useWorkspaceStore((s) => s.specUrlInput);
  const setSpecUrlInput = useWorkspaceStore((s) => s.setSpecUrlInput);

  return (
    <section className={styles.hero} id="parse-api">
      <div className={styles.heroMesh} aria-hidden />
      <div className={styles.gridSubtle} aria-hidden />

      <div className={styles.inner}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} aria-hidden />
          <span className={styles.badgeText}>{t("landing.engineBadge")}</span>
        </div>

        <h1 className={styles.title}>
          <span className={styles.titleLine}>{t("landing.titleLine1")}</span>
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
                {t("landing.inputPlaceholder")}
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
          <div className={styles.supportsRow}>
            <span className={styles.supportsLabel}>{t("landing.supports")}</span>
            <div className={styles.supportsTags}>
              <span className={styles.tagPrimary}>{t("landing.tagOpenApi")}</span>
              <span className={styles.tagMuted}>{t("landing.tagSwagger")}</span>
            </div>
          </div>
        </div>
      </div>

      <LandingMarquee t={t} className={styles.heroMarquee} />
    </section>
  );
}
