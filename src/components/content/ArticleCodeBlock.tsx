"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import hljs from "highlight.js/lib/core";
import yaml from "highlight.js/lib/languages/yaml";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import http from "highlight.js/lib/languages/http";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import sql from "highlight.js/lib/languages/sql";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./content.module.css";

export interface ArticleCodeBlockProps {
  language: string;
  code: string;
  filename?: string;
  caption?: string;
}

const LANGS: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  yaml,
  json,
  bash,
  http,
  javascript,
  typescript,
  xml,
  sql,
};
for (const [name, def] of Object.entries(LANGS)) {
  if (!hljs.getLanguage(name)) hljs.registerLanguage(name, def);
}

const ALIASES: Record<string, string> = {
  yml: "yaml",
  sh: "bash",
  shell: "bash",
  curl: "bash",
  js: "javascript",
  ts: "typescript",
  html: "xml",
};

/** Human label for the editor tab. */
const LABELS: Record<string, string> = {
  yaml: "YAML",
  yml: "YAML",
  json: "JSON",
  bash: "Shell",
  sh: "Shell",
  shell: "Shell",
  http: "HTTP",
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  html: "HTML",
  xml: "XML",
  sql: "SQL",
  text: "Text",
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Editor-chrome code block: mono language tab, copy button, token-based syntax colors, inner horizontal scroll. */
export default function ArticleCodeBlock({ language, code, filename, caption }: ArticleCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lang = (language || "text").toLowerCase();
  const hlLang = ALIASES[lang] ?? lang;
  const label = LABELS[lang] ?? lang;

  const html = useMemo(() => {
    if (!hljs.getLanguage(hlLang)) return escapeHtml(code);
    try {
      return hljs.highlight(code, { language: hlLang, ignoreIllegals: true }).value;
    } catch {
      return escapeHtml(code);
    }
  }, [code, hlLang]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: leave the button as is */
    }
  };

  return (
    <figure className={styles.codeBlockWrapper}>
      <div className={styles.codeBlockHeader}>
        <span className={styles.codeBlockTab}>
          <span className={styles.codeBlockLang}>{label}</span>
          {filename && <span className={styles.codeBlockFile}>{filename}</span>}
        </span>
        <button
          onClick={handleCopy}
          className={`${styles.copyCodeBtn} ${copied ? styles.copyCodeBtnDone : ""}`}
          type="button"
          aria-label={copied ? "Code copied" : "Copy code to clipboard"}
        >
          <MaterialIcon name={copied ? "check" : "content_copy"} size="sm" />
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className={styles.codeBlockPre} tabIndex={0} aria-label={`${label} code`}>
        <code className={`hljs language-${hlLang}`} dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
      {caption && <figcaption className={styles.codeBlockCaption}>{caption}</figcaption>}
    </figure>
  );
}
