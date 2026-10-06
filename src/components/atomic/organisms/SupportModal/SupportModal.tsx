"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import btn from "@/components/atomic/atoms/Button/Button.module.css";
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

const UPI_APPS = ["GPay", "PhonePe", "Paytm", "Cred", "BHIM"];

const FOCUSABLE =
  'a[href], button:not([disabled]), iframe, input:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Tab = "bmac" | "upi";

interface SupportModalProps {
  t: TranslateFn;
}

export default function SupportModal({ t }: SupportModalProps) {
  const open = useWorkspaceStore((s) => s.supportModalOpen);
  const setOpen = useWorkspaceStore((s) => s.setSupportModalOpen);
  const [activeTab, setActiveTab] = useState<Tab>("bmac");
  const [copied, setCopied] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [bmacLoaded, setBmacLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const onClose = useCallback(() => setOpen(false), [setOpen]);

  const onCopyUPI = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText(UPI_ID);
    } catch {
      /* clipboard blocked: the ID stays visible and selectable */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }, []);

  // Lock page scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes; Tab stays inside the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Move focus in on open, give it back on close.
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const tmr = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      clearTimeout(tmr);
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "bmac", label: "Card", icon: "credit_card" },
    { id: "upi", label: "UPI", icon: "qr_code_2" },
  ];

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
        aria-labelledby="support-modal-title"
        aria-describedby="support-modal-desc"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 id="support-modal-title" className={styles.title}>
              Support APIForge
            </h2>
            <p id="support-modal-desc" className={styles.subtitle}>
              APIForge is free and MIT-licensed, and runs on free-tier AI models. Contributions pay
              for model usage and hosting.
            </p>
          </div>
          <button
            type="button"
            className={`${btn.btn} ${btn.ghost} ${btn.md} ${btn.iconOnly} ${styles.close}`}
            onClick={onClose}
            aria-label="Close support dialog"
          >
            <MaterialIcon name="close" size="sm" />
          </button>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Payment method">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`support-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`support-panel-${tab.id}`}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <MaterialIcon name={tab.icon} size="xs" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div
          className={styles.body}
          role="tabpanel"
          id={`support-panel-${activeTab}`}
          aria-labelledby={`support-tab-${activeTab}`}
        >
          {activeTab === "bmac" ? (
            <div className={styles.stack}>
              <div className={styles.widget}>
                {!bmacLoaded && (
                  <div className={styles.loader}>
                    <span className={styles.spinner} aria-hidden />
                    <span className={styles.loaderText}>Loading Buy Me a Coffee…</span>
                  </div>
                )}
                <iframe
                  src={BUY_ME_A_COFFEE_WIDGET_URL}
                  title="Buy Me a Coffee payment form"
                  className={`${styles.iframe} ${bmacLoaded ? styles.iframeLoaded : ""}`}
                  onLoad={() => setBmacLoaded(true)}
                  allow="payment"
                  scrolling="no"
                  frameBorder="0"
                />
              </div>
              <div className={styles.altRow}>
                <span className={styles.altHint}>Prefer a full page?</span>
                <a
                  href={BUY_ME_A_COFFEE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${btn.btn} ${btn.secondary} ${btn.md}`}
                >
                  Open Buy Me a Coffee
                  <MaterialIcon name="open_in_new" size="xs" />
                </a>
              </div>
            </div>
          ) : (
            <div className={styles.stack}>
              <div className={styles.qrRow}>
                <div className={styles.qr}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={UPI_QR_IMG_URL}
                    alt={`UPI QR code for ${UPI_ID}`}
                    className={`${styles.qrImg} ${qrLoaded ? styles.qrImgLoaded : ""}`}
                    onLoad={() => setQrLoaded(true)}
                    width={132}
                    height={132}
                  />
                  {!qrLoaded && (
                    <div className={styles.qrPlaceholder}>
                      <span className={styles.spinner} aria-hidden />
                    </div>
                  )}
                </div>
                <div className={styles.qrMeta}>
                  <h3 className={styles.qrTitle}>Scan with any UPI app</h3>
                  <p className={styles.qrText}>India only. Pick any amount in your app.</p>
                  <ul className={styles.apps} aria-label="Supported apps">
                    {UPI_APPS.map((app) => (
                      <li key={app}>{app}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={styles.vpa}>
                <div className={styles.vpaText}>
                  <span className={styles.vpaLabel}>UPI ID</span>
                  <code className={styles.vpaCode}>{UPI_ID}</code>
                </div>
                <button
                  type="button"
                  className={`${btn.btn} ${btn.secondary} ${btn.sm} ${copied ? styles.copied : ""}`}
                  onClick={onCopyUPI}
                  aria-live="polite"
                >
                  <MaterialIcon name={copied ? "check" : "content_copy"} size="xs" />
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <a
                href={UPI_URI}
                className={`${btn.btn} ${btn.primary} ${btn.md} ${styles.fullWidth}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("support.openUpiApp")}
                <MaterialIcon name="open_in_new" size="xs" />
              </a>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <MaterialIcon name="favorite" size="xs" className={styles.footerIcon} />
          <p className={styles.footerText}>
            Can&apos;t contribute money? Code, issues, and stars help too.{" "}
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
              Contribute on GitHub
            </a>
            {" · "}
            <a href="/support" className={styles.footerLink}>
              Why is there an AI limit?
            </a>
          </p>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
