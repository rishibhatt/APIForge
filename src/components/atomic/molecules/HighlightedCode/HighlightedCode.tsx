"use client";

import { useMemo } from "react";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";
import markdown from "highlight.js/lib/languages/markdown";
import javascript from "highlight.js/lib/languages/javascript";
import styles from "./HighlightedCode.module.css";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

hljs.registerLanguage("json", json);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("javascript", javascript);

export type HighlightLanguage = "typescript" | "json" | "markdown" | "javascript";

export type HighlightCodeSkin = "standard" | "forgeTs";

const LANGUAGE_ALIASES: Record<string, HighlightLanguage> = {
  ts: "typescript",
  tsx: "typescript",
  typescript: "typescript",
  js: "javascript",
  jsx: "javascript",
  javascript: "javascript",
  json: "json",
  jsonc: "json",
  md: "markdown",
  markdown: "markdown",
};

/** Map a fence label (ts, js, json, md...) to a registered language, or null when unsupported. */
export function resolveHighlightLanguage(label: string): HighlightLanguage | null {
  return LANGUAGE_ALIASES[label.trim().toLowerCase()] ?? null;
}

interface HighlightedCodeProps {
  code: string;
  language: HighlightLanguage;
  className?: string;
  /** Read-only “IDE” chrome + One Dark–style tokens for TypeScript output */
  skin?: HighlightCodeSkin;
  /** Wrap long lines (default). Set false to scroll horizontally instead. */
  wrap?: boolean;
}

export default function HighlightedCode({
  code,
  language,
  className = "",
  skin = "standard",
  wrap = true,
}: HighlightedCodeProps) {
  const html = useMemo(() => {
    if (!code) return "";
    try {
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    } catch {
      try {
        return hljs.highlight(code, { language: "javascript", ignoreIllegals: true })
          .value;
      } catch {
        return escapeHtml(code);
      }
    }
  }, [code, language]);

  const lineNumbers = useMemo(() => {
    const lines = code.split("\n");
    return lines.length > 0 ? lines.length : 1;
  }, [code]);

  if (skin === "forgeTs" && language === "typescript") {
    return (
      <div
        className={`${styles.forgeShell} ${className}`.trim()}
        role="region"
        aria-label="Generated TypeScript (read-only)"
      >
        <div className={styles.forgeGutter} aria-hidden>
          {Array.from({ length: lineNumbers }, (_, i) => (
            <div key={i + 1} className={styles.forgeLineNum}>
              {i + 1}
            </div>
          ))}
        </div>
        <pre className={`${styles.preForge} hljs`} tabIndex={0}>
          <code
            className={`${styles.codeForge} hljs language-typescript`}
            dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
          />
        </pre>
      </div>
    );
  }

  return (
    <pre
      className={`${styles.pre} ${wrap ? "" : styles.preScroll} hljs ${className}`.replace(/\s+/g, " ").trim()}
      tabIndex={0}
    >
      <code
        className={`${styles.code} hljs`}
        dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
      />
    </pre>
  );
}
