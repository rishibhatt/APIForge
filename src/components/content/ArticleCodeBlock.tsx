"use client";

import { useState } from "react";
import styles from "./content.module.css";

export interface ArticleCodeBlockProps {
  language: string;
  code: string;
  filename?: string;
  caption?: string;
}

export default function ArticleCodeBlock({
  language,
  code,
  filename,
  caption,
}: ArticleCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
    }
  };

  return (
    <div className={styles.codeBlockWrapper}>
      <div className={styles.codeBlockHeader}>
        <span className={styles.codeBlockLang}>{filename || language}</span>
        <button
          onClick={handleCopy}
          className={styles.copyCodeBtn}
          type="button"
          aria-label="Copy code to clipboard"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className={styles.codeBlockPre}>
        <code className={`language-${language}`}>{code}</code>
      </pre>
      {caption && <p className={styles.codeBlockCaption}>{caption}</p>}
    </div>
  );
}
