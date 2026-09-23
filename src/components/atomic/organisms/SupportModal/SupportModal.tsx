"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { TranslateFn } from "@/context/LanguageContext";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./SupportModal.module.css";

const UPI_ID = "bhattrishu07-1@oksbi";
const UPI_PAYEE_NAME = "Rishi Bhatt";
const UPI_URI = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&cu=INR`;
const UPI_QR_IMG_URL = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(UPI_URI)}`;

const BUY_ME_A_COFFEE_WIDGET_URL = "https://www.buymeacoffee.com/widget/page/bhattrishuu";
const BUY_ME_A_COFFEE_URL = "https://www.buymeacoffee.com/bhattrishuu";

const GITHUB_REPO_URL = "https://github.com/rishibhatt/APIForge";

interface SupportModalProps {
  t: TranslateFn;
}

export default function SupportModal({ t }: SupportModalProps) {
  const open = useWorkspaceStore((s) => s.supportModalOpen);
  const setOpen = useWorkspaceStore((s) => s.setSupportModalOpen);
  const [activeTab, setActiveTab] = useState<"bmac" | "upi">("bmac");
  const [copied, setCopied] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [bmacLoaded, setBmacLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const onClose = useCallback(() => setOpen(false), [setOpen]);

  const onCopyUPI = useCallback(async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(UPI_ID);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, []);

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
        className={`${styles.panel} ${activeTab === "bmac" ? styles.panelBmac : styles.panelUpi}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.coffeeBadge}>
              <span className={styles.coffeeEmoji}>☕</span>
              <span className={styles.sparkleDot} />
            </div>
            <div>
              <h2 id="support-modal-title" className={styles.title}>
                {t("support.modalTitle")}
              </h2>
              <p className={styles.subtitle}>{t("support.modalSubtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            className={`${styles.closeBtn} focusRing`}
            onClick={onClose}
            aria-label="Close support dialog"
          >
            <MaterialIcon name="close" size="md" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bmac"}
            className={`${styles.tabBtn} ${activeTab === "bmac" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("bmac")}
          >
            <span className={styles.tabIcon}>☕</span>
            <span>Buy Me a Coffee (Card / Pay)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "upi"}
            className={`${styles.tabBtn} ${activeTab === "upi" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("upi")}
          >
            <span className={styles.tabIcon}>⚡</span>
            <span>UPI Instant (QR / Scan)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className={`${styles.body} ${activeTab === "bmac" ? styles.bodyBmac : styles.bodyUpi}`}>
          {activeTab === "bmac" ? (
            <div className={styles.bmacDirectContainer}>
              <div className={styles.widgetCard}>
                {!bmacLoaded && (
                  <div className={styles.widgetLoader}>
                    <span className={styles.qrSpin} />
                    <span className={styles.loaderText}>Loading payment widget…</span>
                  </div>
                )}
                {/* Direct interactive Buy Me a Coffee embedded payment widget */}
                <iframe
                  src={BUY_ME_A_COFFEE_WIDGET_URL}
                  title="Buy Me a Coffee Widget"
                  className={`${styles.bmacIframe} ${bmacLoaded ? styles.bmacIframeLoaded : ""}`}
                  onLoad={() => setBmacLoaded(true)}
                  allow="payment"
                  scrolling="no"
                  frameBorder="0"
                />
              </div>

              {/* Direct Open Link fallback */}
              <div className={styles.bmacExternalRow}>
                <span className={styles.externalHint}>Need direct link?</span>
                <a
                  href={BUY_ME_A_COFFEE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.externalLink}
                >
                  <span>Open in New Tab</span>
                  <MaterialIcon name="open_in_new" size="sm" />
                </a>
              </div>
            </div>
          ) : (
            <div className={styles.upiContent}>
              <div className={styles.qrCard}>
                <div className={styles.qrWrapper}>
                  {/* Real, scannable UPI QR Code */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={UPI_QR_IMG_URL}
                    alt={`Scan UPI QR code to pay ${UPI_ID}`}
                    className={`${styles.qrImg} ${qrLoaded ? styles.qrImgLoaded : ""}`}
                    onLoad={() => setQrLoaded(true)}
                    width={130}
                    height={130}
                  />
                  {!qrLoaded && (
                    <div className={styles.qrPlaceholder}>
                      <span className={styles.qrSpin} />
                    </div>
                  )}
                </div>
                <div className={styles.qrMeta}>
                  <h4 className={styles.qrTitle}>{t("support.upiCardTitle")}</h4>
                  <p className={styles.qrSubtitle}>{t("support.upiCardSubtitle")}</p>
                  
                  {/* Supported apps chips */}
                  <div className={styles.appBadges}>
                    {["GPay", "PhonePe", "Paytm", "Cred", "BHIM"].map((app) => (
                      <span key={app} className={styles.appChip}>
                        {app}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Copyable VPA section */}
              <div className={styles.vpaBox}>
                <div className={styles.vpaDetails}>
                  <span className={styles.vpaLabel}>{t("support.upiIdLabel")}</span>
                  <code className={styles.vpaCode}>{UPI_ID}</code>
                </div>
                <button
                  type="button"
                  className={`${styles.copyBtn} ${copied ? styles.copySuccess : ""}`}
                  onClick={onCopyUPI}
                >
                  <MaterialIcon
                    name={copied ? "check" : "content_copy"}
                    size="sm"
                  />
                  <span>{copied ? t("support.copied") : t("support.copyUpi")}</span>
                </button>
              </div>

              {/* Mobile Direct Pay Button */}
              <a
                href={UPI_URI}
                className={styles.upiDirectBtn}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MaterialIcon name="open_in_new" size="sm" />
                <span>{t("support.openUpiApp")}</span>
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className={styles.footer}>
          <div className={styles.footerShield}>
            <MaterialIcon name="verified_user" size="sm" />
          </div>
          <p className={styles.footerText}>
            {t("support.backerThankYou")}{" "}
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerGithubLink}
            >
              Contribute on GitHub ↗
            </a>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
