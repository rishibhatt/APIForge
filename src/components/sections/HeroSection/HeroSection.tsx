"use client";

import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
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
    <section className={styles.section}>
      <div className={styles.bgGlow} aria-hidden />
      <div className={styles.inner}>
        <h1 className={styles.title}>
          {t("hero.titleLine1")}
          <br />
          <span className={styles.titleGradient}>{t("hero.titleLine2")}</span>
        </h1>
        <p className={styles.subtitle}>{t("hero.subtitle")}</p>

        <div className={styles.inputShell}>
          <div className={styles.inputGlow} aria-hidden />
          <div className={styles.inputRow}>
            <MaterialIcon name="link" className={styles.linkIcon} size="md" />
            <label htmlFor="forge-url" className="srOnly">
              {t("hero.inputPlaceholder")}
            </label>
            <input
              id="forge-url"
              type="url"
              name="url"
              autoComplete="url"
              placeholder={t("hero.inputPlaceholder")}
              className={`${styles.input} focusRing`}
              value={specUrlInput}
              onChange={(e) => setSpecUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onForge();
              }}
            />
            <button
              type="button"
              className={`${styles.forgeBtn} focusRing`}
              onClick={onForge}
              disabled={isLoading}
            >
              {isLoading ? (
                t("common.loading")
              ) : (
                <>
                  <span className={styles.forgeLabelFull}>{t("hero.forgeCta")}</span>
                  <span className={styles.forgeLabelShort}>{t("hero.forgeCtaShort")}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.formats}>
          <span className={styles.formatsLabel}>{t("hero.supportedFormats")}</span>
          <div className={styles.formatTags}>
            <span>OpenAPI 3.x</span>
            <span>Swagger2</span>
            <span>JSON / YAML</span>
          </div>
        </div>

        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <MaterialIcon name="speed" size="sm" />
            </div>
            <h3 className={styles.cardTitle}>{t("hero.card1Title")}</h3>
            <p className={styles.cardText}>{t("hero.card1Body")}</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <MaterialIcon name="auto_graph" size="sm" />
            </div>
            <h3 className={styles.cardTitle}>{t("hero.card2Title")}</h3>
            <p className={styles.cardText}>{t("hero.card2Body")}</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <MaterialIcon name="integration_instructions" size="sm" />
            </div>
            <h3 className={styles.cardTitle}>{t("hero.card3Title")}</h3>
            <p className={styles.cardText}>{t("hero.card3Body")}</p>
          </div>
        </div>
      </div>
      <div className={styles.footerRule} aria-hidden />
    </section>
  );
}
