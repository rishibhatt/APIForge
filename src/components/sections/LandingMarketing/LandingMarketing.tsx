"use client";

import Image from "next/image";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { LANDING_SHOWCASE_IMAGE_PATH } from "@/constants/assets";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./LandingMarketing.module.css";

export interface LandingMarketingProps {
  t: TranslateFn;
  isLoading: boolean;
  error: string | null;
  onForge: () => void;
}

export default function LandingMarketing({
  t,
  isLoading,
  error,
  onForge,
}: LandingMarketingProps) {
  const specUrlInput = useWorkspaceStore((s) => s.specUrlInput);
  const setSpecUrlInput = useWorkspaceStore((s) => s.setSpecUrlInput);

  return (
    <>
      <section
        className={styles.section}
        id="what-apiforge-does"
        aria-labelledby="landing-what-heading"
      >
        <div className={styles.inner}>
          <p className={styles.eyebrow}>{t("landing.marketing.whatEyebrow")}</p>
          <h2 id="landing-what-heading" className={styles.title}>
            {t("landing.marketing.whatTitle")}
          </h2>
          <p className={styles.subtitle}>{t("landing.marketing.whatSubtitle")}</p>
          <div className={styles.grid3}>
            {(
              [
                ["api", "landing.marketing.card1Title", "landing.marketing.card1Body"],
                ["code_blocks", "landing.marketing.card2Title", "landing.marketing.card2Body"],
                ["public", "landing.marketing.card3Title", "landing.marketing.card3Body"],
              ] as const
            ).map(([icon, titleKey, bodyKey]) => (
              <article key={titleKey} className={styles.card}>
                <div className={styles.cardIcon}>
                  <MaterialIcon name={icon} size="md" />
                </div>
                <h3 className={styles.cardTitle}>{t(titleKey)}</h3>
                <p className={styles.cardBody}>{t(bodyKey)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.sectionAlt}`}
        id="workspace-showcase"
        aria-labelledby="landing-showcase-heading"
      >
        <div className={styles.inner}>
          <div className={styles.showcase}>
            <div>
              <p className={styles.eyebrow}>{t("landing.marketing.showcaseEyebrow")}</p>
              <h2 id="landing-showcase-heading" className={styles.title}>
                {t("landing.marketing.showcaseTitle")}
              </h2>
              <p className={styles.subtitle}>{t("landing.marketing.showcaseSubtitle")}</p>
              <ul className={styles.showcaseList}>
                {t("landing.marketing.showcaseBullets")
                  .split("|")
                  .map((line) => (
                  <li key={line}>
                    <span className={styles.check} aria-hidden>
                      ✓
                    </span>
                    {line.trim()}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.placeholder}>
              <div className={styles.showcaseImageWrap}>
                <Image
                  src={LANDING_SHOWCASE_IMAGE_PATH}
                  alt={t("landing.marketing.showcaseImageAlt")}
                  fill
                  className={styles.showcaseImage}
                  sizes="(max-width: 900px) 100vw, 42rem"
                  quality={92}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.sectionSteps}`}
        id="how-it-works"
        aria-labelledby="landing-steps-heading"
      >
        <div className={styles.inner}>
          <div className={styles.stepsIntro}>
            <p className={styles.eyebrow}>{t("landing.marketing.stepsEyebrow")}</p>
            <h2 id="landing-steps-heading" className={styles.title}>
              {t("landing.marketing.stepsTitle")}
            </h2>
            <p className={styles.subtitle}>{t("landing.marketing.stepsSubtitle")}</p>
          </div>
          <div className={styles.stepsShell}>
            <div className={styles.stepsRail} aria-hidden />
            <div className={styles.steps}>
              {(
                [
                  ["1", "dataset_linked", "landing.marketing.step1Title", "landing.marketing.step1Body"],
                  ["2", "hub", "landing.marketing.step2Title", "landing.marketing.step2Body"],
                  ["3", "integration_instructions", "landing.marketing.step3Title", "landing.marketing.step3Body"],
                  ["4", "network_ping", "landing.marketing.step4Title", "landing.marketing.step4Body"],
                ] as const
              ).map(([num, icon, titleKey, bodyKey]) => (
                <article key={num} className={styles.stepCard}>
                  <div className={styles.stepNum}>{num}</div>
                  <div className={styles.stepIcon}>
                    <MaterialIcon name={icon} size="md" />
                  </div>
                  <h3 className={styles.stepTitle}>{t(titleKey)}</h3>
                  <p className={styles.stepBody}>{t(bodyKey)}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.sectionAlt} ${styles.sectionPlay}`}
        id="playground"
        aria-labelledby="landing-play-heading"
      >
        <div className={styles.inner}>
          <div className={styles.playgroundCard}>
            <div className={styles.playgroundMesh} aria-hidden />
            <div className={styles.playgroundContent}>
              <p className={styles.eyebrow}>{t("landing.marketing.playEyebrow")}</p>
              <h2 id="landing-play-heading" className={styles.title}>
                {t("landing.marketing.playTitle")}
              </h2>
              <p className={styles.subtitle}>{t("landing.marketing.playSubtitle")}</p>
              <div className={styles.inputCanvas}>
                <div className={styles.inputRow}>
                  <div className={styles.inputWrap}>
                    <MaterialIcon name="link" className={styles.linkIcon} size="md" />
                    <label htmlFor="landing-playground-url" className="srOnly">
                      {t("landing.inputPlaceholder")}
                    </label>
                    <input
                      id="landing-playground-url"
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
                      <MaterialIcon name="rocket_launch" className={styles.parseIcon} size="sm" />
                    ) : null}
                  </button>
                </div>
              </div>
              {error ? <p className={styles.inlineError}>{error}</p> : null}
            </div>
            <div className={styles.playgroundVisual} aria-hidden>
              <div className={styles.specPreview}>
                <div className={styles.specPreviewChrome}>
                  <span className={styles.specChromeDot} />
                  <span className={styles.specChromeDot} />
                  <span className={styles.specChromeDot} />
                  <span className={styles.specFileName}>openapi.json</span>
                </div>
                <ul className={styles.specOpList}>
                  <li className={styles.specOp}>
                    <span className={styles.methodGet}>GET</span>
                    <span className={styles.specPath}>/users</span>
                  </li>
                  <li className={styles.specOp}>
                    <span className={styles.methodPost}>POST</span>
                    <span className={styles.specPath}>/orders</span>
                  </li>
                  <li className={styles.specOp}>
                    <span className={styles.methodGet}>GET</span>
                    <span className={styles.specPath}>/orders/{"{"}id{"}"}</span>
                  </li>
                </ul>
                <div className={styles.specPreviewMeta}>
                  <span className={styles.specVer}>OpenAPI 3.0</span>
                  <span className={styles.specSep} />
                  <span className={styles.specHint}>parsed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.sectionWhy}`}
        id="why-apiforge"
        aria-labelledby="landing-why-heading"
      >
        <div className={styles.whyBackdrop} aria-hidden />
        <div className={styles.inner}>
          <div className={styles.whyIntro}>
            <p className={styles.eyebrow}>{t("landing.marketing.whyEyebrow")}</p>
            <h2 id="landing-why-heading" className={styles.title}>
              {t("landing.marketing.whyTitle")}
            </h2>
            <p className={styles.subtitle}>{t("landing.marketing.whySubtitle")}</p>
          </div>
          <div className={styles.grid4}>
            {(
              [
                ["web_asset", "landing.marketing.why1Title", "landing.marketing.why1Body"],
                ["memory", "landing.marketing.why2Title", "landing.marketing.why2Body"],
                ["developer_board", "landing.marketing.why3Title", "landing.marketing.why3Body"],
                ["support_agent", "landing.marketing.why4Title", "landing.marketing.why4Body"],
              ] as const
            ).map(([icon, titleKey, bodyKey]) => (
              <article key={titleKey} className={styles.whyCard}>
                <div className={styles.whyIcon}>
                  <MaterialIcon name={icon} size="md" />
                </div>
                <h3 className={styles.whyTitle}>{t(titleKey)}</h3>
                <p className={styles.whyBody}>{t(bodyKey)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
