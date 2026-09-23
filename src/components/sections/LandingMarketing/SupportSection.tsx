"use client";

import React from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { TranslateFn } from "@/context/LanguageContext";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./SupportSection.module.css";

interface SupportSectionProps {
  t: TranslateFn;
}

export default function SupportSection({ t }: SupportSectionProps) {
  const toggleSupportModal = useWorkspaceStore((s) => s.toggleSupportModal);

  return (
    <section
      className={styles.section}
      id="support-apiforge"
      aria-labelledby="support-section-heading"
    >
      <div className={styles.meshGlow} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.eyebrowBadgeGroup}>
            <div className={styles.eyebrowBadge}>
              <span className={styles.pulsingHeart}>❤️</span>
              <span className={styles.eyebrowText}>{t("support.sectionEyebrow")}</span>
            </div>
            <div className={styles.statusBadge}>
              <span className={styles.statusDot} />
              <span className={styles.statusText}>{t("support.sectionStatusBadge")}</span>
            </div>
          </div>
          <h2 id="support-section-heading" className={styles.title}>
            {t("support.sectionTitle")}
          </h2>
          <p className={styles.subtitle}>{t("support.sectionSubtitle")}</p>
        </div>

        {/* 3 Value & Roadmap Cards */}
        <div className={styles.grid}>
          {/* Card 1: Frontier Models */}
          <article className={`${styles.card} ${styles.cardFrontier}`}>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconWrap} ${styles.iconPurple}`}>
                <MaterialIcon name="neurology" size="md" />
              </div>
              <span className={styles.tagBadge}>Paid LLMs</span>
            </div>
            <h3 className={styles.cardTitle}>{t("support.card1Title")}</h3>
            <p className={styles.cardBody}>{t("support.card1Body")}</p>
            <div className={styles.modelChips}>
              <span className={styles.modelChip}>Claude 3.5 Sonnet</span>
              <span className={styles.modelChip}>GPT-4o</span>
              <span className={styles.modelChip}>DeepSeek R1 Pro</span>
            </div>
          </article>

          {/* Card 2: Zero Rate Limits */}
          <article className={`${styles.card} ${styles.cardSpeed}`}>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconWrap} ${styles.iconGold}`}>
                <MaterialIcon name="bolt" size="md" />
              </div>
              <span className={styles.tagBadgeGold}>Low Latency</span>
            </div>
            <h3 className={styles.cardTitle}>{t("support.card2Title")}</h3>
            <p className={styles.cardBody}>{t("support.card2Body")}</p>
            <div className={styles.modelChips}>
              <span className={styles.modelChip}>Sub-second LPU Pool</span>
              <span className={styles.modelChip}>Zero Throttling</span>
            </div>
          </article>

          {/* Card 3: Free Open-Source Workbench */}
          <article className={`${styles.card} ${styles.cardFree}`}>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconWrap} ${styles.iconEmerald}`}>
                <MaterialIcon name="lock_open" size="md" />
              </div>
              <span className={styles.tagBadgeEmerald}>Open Forever</span>
            </div>
            <h3 className={styles.cardTitle}>{t("support.card3Title")}</h3>
            <p className={styles.cardBody}>{t("support.card3Body")}</p>
            <div className={styles.modelChips}>
              <span className={styles.modelChip}>OpenAPI Explorer</span>
              <span className={styles.modelChip}>Schema Quality Engine</span>
            </div>
          </article>
        </div>

        {/* Action Bar with Buy Me a Coffee Badge + UPI QR Trigger */}
        <div className={styles.actionRow}>
          <div className={styles.btnGroup}>
            <button
              type="button"
              className={`${styles.supportCtaBtn} ${styles.supportCtaBtnGold} focusRing`}
              onClick={toggleSupportModal}
            >
              <span className={styles.btnGlow} aria-hidden />
              <span className={styles.coffeeCup}>☕</span>
              <span className={styles.btnText}>Buy Me a Coffee (Pay on Site)</span>
              <MaterialIcon name="credit_card" size="sm" />
            </button>

            <button
              type="button"
              className={`${styles.supportCtaBtn} ${styles.supportCtaBtnEmerald} focusRing`}
              onClick={toggleSupportModal}
            >
              <span className={styles.btnGlow} aria-hidden />
              <span className={styles.coffeeCup}>⚡</span>
              <span className={styles.btnText}>Scan UPI QR Code</span>
              <MaterialIcon name="qr_code_scanner" size="sm" />
            </button>
          </div>

          <div className={styles.upiQuickHint}>
            <span className={styles.upiBadge}>UPI</span>
            <span className={styles.hintCode}>bhattrishu07-1@oksbi</span>
            <span className={styles.hintSep}>•</span>
            <span className={styles.hintText}>GPay, PhonePe, Paytm, BHIM & Cards</span>
          </div>
        </div>
      </div>
    </section>
  );
}
