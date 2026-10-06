"use client";

import { useId, useRef, useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { SanitizedRoastReport } from "@/lib/roast/types";
import { useRoastShare, type CopyKey } from "./useRoastShare";
import shared from "./RoastSection.module.css";
import styles from "./RoastShare.module.css";

export interface RoastShareProps {
  report: SanitizedRoastReport;
}

type SnippetKind = "markdown" | "html" | "url";

const SNIPPETS: { id: SnippetKind; label: string }[] = [
  { id: "markdown", label: "Markdown" },
  { id: "html", label: "HTML" },
  { id: "url", label: "URL" },
];

/** Permanent link + README badge. Social share lives in the composer under the poster. */
export default function RoastShare({ report }: RoastShareProps) {
  const s = useRoastShare(report);
  const uid = useId();
  const [kind, setKind] = useState<SnippetKind>("markdown");
  const linkRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLElement>(null);

  const snippet = kind === "markdown" ? s.markdown : kind === "html" ? s.html : s.badgeUrl;
  const current = SNIPPETS.find((x) => x.id === kind) ?? SNIPPETS[0];
  const copyKey: CopyKey = kind;

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = SNIPPETS[(i + (e.key === "ArrowRight" ? 1 : SNIPPETS.length - 1)) % SNIPPETS.length];
    setKind(next.id);
    document.getElementById(`${uid}-tab-${next.id}`)?.focus();
  };

  return (
    <section id="share" className={shared.section} aria-labelledby="share-title">
      <div className={shared.head} data-reveal>
        <h2 id="share-title" className={shared.title}>
          Badge and link
        </h2>
        <p className={shared.lede}>Pin the score to your README. Watch it go up.</p>
      </div>

      <div className={styles.wrap} data-reveal>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3 className={styles.label}>Public link</h3>
            <div className={styles.field}>
              <input
                ref={linkRef}
                className={styles.input}
                value={s.reportUrl}
                readOnly
                aria-label="Public report link"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                className={shared.btnSecondary}
                onClick={() =>
                  s.copy(s.reportUrl, {
                    key: "link",
                    title: "Link copied",
                    description: "Anyone with it can open this report.",
                    fallback: linkRef,
                  })
                }
              >
                <MaterialIcon name={s.copied === "link" ? "check" : "content_copy"} size="xs" />
                <span>{s.copied === "link" ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className={styles.note}>Links expire after 7 days.</p>
          </div>

          <div className={styles.card}>
            <h3 className={styles.label}>README badge</h3>
            <div className={styles.preview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.badgeUrl} alt={`APIForge score badge: ${report.score}/100`} width={240} height={40} loading="lazy" />
            </div>

            <div className={styles.tabs} role="tablist" aria-label="Badge snippet format">
              {SNIPPETS.map((t, i) => (
                <button
                  key={t.id}
                  id={`${uid}-tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={kind === t.id}
                  aria-controls={`${uid}-panel`}
                  tabIndex={kind === t.id ? 0 : -1}
                  className={`${styles.tab} ${kind === t.id ? styles.tabOn : ""}`}
                  onClick={() => setKind(t.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${kind}`} className={styles.snippet}>
              <code ref={codeRef} className={styles.code} tabIndex={0}>
                {snippet}
              </code>
              <button
                type="button"
                className={shared.btnSecondary}
                onClick={() =>
                  s.copy(snippet, {
                    key: copyKey,
                    title: `${current.label} copied`,
                    description: kind === "url" ? "Badge image URL." : "Paste it into your README.",
                    fallback: codeRef,
                  })
                }
              >
                <MaterialIcon name={s.copied === copyKey ? "check" : "content_copy"} size="xs" />
                <span>{s.copied === copyKey ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className={styles.note}>Updates when the report is re-run.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
