"use client";

import { Fragment, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import HighlightedCode, {
  resolveHighlightLanguage,
} from "@/components/atomic/molecules/HighlightedCode/HighlightedCode";
import { copyWithToast } from "./clipboard";
import { parseMarkdown, type Block, type Inline, type ListBlock } from "./markdown";
import styles from "./AiMarkdown.module.css";

interface AiMarkdownProps {
  source: string;
  /** Show a typing caret at the end of the text while tokens are still arriving. */
  streaming?: boolean;
  className?: string;
}

const LANG_LABELS: Record<string, string> = {
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  json: "JSON",
  md: "Markdown",
  markdown: "Markdown",
  sh: "Shell",
  bash: "Shell",
  shell: "Shell",
  http: "HTTP",
  yaml: "YAML",
  yml: "YAML",
  py: "Python",
  python: "Python",
};

function langLabel(lang: string): string {
  if (!lang) return "Code";
  return LANG_LABELS[lang] ?? lang;
}

function Caret() {
  return <span className={styles.caret} aria-hidden />;
}

function renderInline(nodes: Inline[]): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "text":
        return <Fragment key={i}>{n.v}</Fragment>;
      case "code":
        return (
          <code key={i} className={styles.inlineCode}>
            {n.v}
          </code>
        );
      case "strong":
        return <strong key={i}>{renderInline(n.c)}</strong>;
      case "em":
        return <em key={i}>{renderInline(n.c)}</em>;
      case "del":
        return <del key={i}>{renderInline(n.c)}</del>;
      case "link":
        return (
          <a key={i} href={n.href} className={styles.link} target="_blank" rel="noopener noreferrer nofollow">
            {renderInline(n.c)}
          </a>
        );
      case "br":
        return <br key={i} />;
    }
  });
}

function CodeBlock({ lang, code, live }: { lang: string; code: string; live: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlight = resolveHighlightLanguage(lang);

  const onCopy = useCallback(async () => {
    const ok = await copyWithToast(code, "Code");
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }, [code]);

  return (
    <figure className={styles.codeBlock}>
      <figcaption className={styles.codeHead}>
        <span className={styles.codeLang}>{langLabel(lang)}</span>
        <button
          type="button"
          className={`${styles.copyBtn} focusRing`}
          onClick={() => void onCopy()}
          disabled={!code}
          aria-label={`Copy ${langLabel(lang)} code`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <div className={styles.codeBody}>
        {highlight && !live ? (
          <HighlightedCode code={code} language={highlight} wrap={false} />
        ) : (
          // While the fence is still open the text changes every chunk: skip re-highlighting.
          <pre className={styles.plainPre} tabIndex={0}>
            <code>{code || " "}</code>
          </pre>
        )}
      </div>
    </figure>
  );
}

function ListView({ list, caretLast }: { list: ListBlock; caretLast: boolean }) {
  const Tag = list.ordered ? "ol" : "ul";
  return (
    <Tag className={styles.list} start={list.ordered && list.start !== 1 ? list.start : undefined}>
      {list.items.map((it, i) => {
        const last = i === list.items.length - 1;
        return (
          <li key={i}>
            {renderInline(it.inline)}
            {caretLast && last && !it.children ? <Caret /> : null}
            {it.children ? <ListView list={it.children} caretLast={caretLast && last} /> : null}
          </li>
        );
      })}
    </Tag>
  );
}

function BlockView({ block, caret }: { block: Block; caret: boolean }) {
  switch (block.t) {
    case "heading": {
      const Tag = (`h${Math.min(6, block.level + 2)}` as "h3" | "h4" | "h5" | "h6");
      return (
        <Tag className={styles[`h${block.level}` as "h1"]}>
          {renderInline(block.inline)}
          {caret ? <Caret /> : null}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className={styles.p}>
          {renderInline(block.inline)}
          {caret ? <Caret /> : null}
        </p>
      );
    case "code":
      return <CodeBlock lang={block.lang} code={block.code} live={!block.closed && caret} />;
    case "list":
      return <ListView list={block} caretLast={caret} />;
    case "quote":
      return (
        <blockquote className={styles.quote}>
          {block.blocks.map((b, i) => (
            <BlockView key={i} block={b} caret={caret && i === block.blocks.length - 1} />
          ))}
        </blockquote>
      );
    case "table":
      return (
        <div className={styles.tableWrap} role="region" tabIndex={0} aria-label="Table">
          <table className={styles.table}>
            <thead>
              <tr>
                {block.head.map((c, i) => (
                  <th key={i} scope="col" style={{ textAlign: block.align[i] ?? undefined }}>
                    {renderInline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} style={{ textAlign: block.align[ci] ?? undefined }}>
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "hr":
      return <hr className={styles.hr} />;
  }
}

/** Renders assistant markdown as React elements. Never injects raw HTML. */
export default function AiMarkdown({ source, streaming = false, className = "" }: AiMarkdownProps) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  const last = blocks[blocks.length - 1];
  // Block types that can hold the caret inline; otherwise it sits on its own line after the block.
  const inlineCaret =
    last != null && (last.t === "paragraph" || last.t === "heading" || last.t === "list" || last.t === "quote");

  return (
    <div className={`${styles.md} ${className}`.trim()}>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} caret={streaming && i === blocks.length - 1 && (inlineCaret || b.t === "code")} />
      ))}
      {streaming && (blocks.length === 0 || (last && !inlineCaret && last.t !== "code")) ? (
        <p className={styles.p}>
          <Caret />
        </p>
      ) : null}
    </div>
  );
}
