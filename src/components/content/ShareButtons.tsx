"use client";

import { useEffect, useRef, useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./content.module.css";

export interface ShareButtonsProps {
  title: string;
  url: string;
}

export default function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const xShare = `https://x.com/intent/post?text=${encodedTitle}&url=${encodedUrl}`;
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={styles.shareWrap}>
      <span className={styles.shareLabel}>Share</span>
      <div className={styles.shareActions}>
        <a href={xShare} target="_blank" rel="noopener noreferrer" className={styles.shareBtn}>
          X
          <span className={styles.srOnly}> (opens in a new tab)</span>
        </a>
        <a href={linkedinShare} target="_blank" rel="noopener noreferrer" className={styles.shareBtn}>
          LinkedIn
          <span className={styles.srOnly}> (opens in a new tab)</span>
        </a>
        <button
          onClick={copyToClipboard}
          className={`${styles.shareBtn} ${copied ? styles.shareBtnDone : ""}`}
          type="button"
          aria-live="polite"
        >
          <MaterialIcon name={copied ? "check" : "link"} size="sm" />
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
