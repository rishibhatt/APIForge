"use client";

import { useState } from "react";
import styles from "./content.module.css";

export interface ShareButtonsProps {
  title: string;
  url: string;
}

export default function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const xShare = `https://x.com/intent/post?text=${encodedTitle}&url=${encodedUrl}`;
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback */
    }
  };

  return (
    <div className={styles.shareWrap}>
      <span className={styles.shareLabel}>Share:</span>
      <a
        href={xShare}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.shareBtn}
        aria-label="Share on X"
      >
        𝕏 Post
      </a>
      <a
        href={linkedinShare}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.shareBtn}
        aria-label="Share on LinkedIn"
      >
        in Share
      </a>
      <button
        onClick={copyToClipboard}
        className={styles.shareBtn}
        type="button"
      >
        {copied ? "✓ Copied Link" : "📋 Copy Link"}
      </button>
    </div>
  );
}
