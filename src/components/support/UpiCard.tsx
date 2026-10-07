"use client";

import { useCallback, useState } from "react";
import { toast } from "@/components/providers/Toaster/toast";
import { UPI_ID, UPI_QR_IMG_URL, UPI_URI } from "@/lib/support/links";
import styles from "./Support.module.css";

export default function UpiCard() {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
      toast.success("UPI ID copied", { id: "support-upi-copy", description: "Paste it into any UPI app." });
    } catch {
      toast.error("Could not copy the UPI ID", {
        id: "support-upi-copy",
        description: "Select the ID shown on the page and copy it by hand.",
      });
    }
  }, []);

  return (
    <div className={styles.upi}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={UPI_QR_IMG_URL}
        alt={`UPI QR code for ${UPI_ID}`}
        className={styles.qr}
        width={132}
        height={132}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className={styles.upiBody}>
        <div className={styles.vpa}>
          <span className={styles.vpaLabel}>UPI ID</span>
          <code className={styles.vpaCode}>{UPI_ID}</code>
        </div>
        <div className={styles.cardActions}>
          <button type="button" className={styles.btnSecondary} onClick={onCopy} aria-live="polite">
            {copied ? "Copied" : "Copy ID"}
          </button>
          <a className={styles.btnSecondary} href={UPI_URI}>
            Open UPI app
          </a>
        </div>
        <p className={styles.fine}>India only. Pick any amount in your app.</p>
      </div>
    </div>
  );
}
