"use client";

import { useId, useRef, useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { SanitizedRoastReport } from "@/lib/roast/types";
import { SHARE_TONES, X_LIMIT, useRoastShare, xLength, type ShareTone } from "./useRoastShare";
import styles from "./ShareComposer.module.css";

export interface ShareComposerProps {
  report: SanitizedRoastReport;
}

export function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

/**
 * Share bar under the poster: tone chips, an editable draft with the X character count, the share
 * targets, and a "challenge a friend" link that the entry page turns into a banner.
 */
export default function ShareComposer({ report }: ShareComposerProps) {
  const s = useRoastShare(report);
  const uid = useId();
  const [tone, setTone] = useState<ShareTone>("roast");
  // null = show the generated draft; a string = the user's own edit.
  const [edited, setEdited] = useState<string | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const challengeRef = useRef<HTMLTextAreaElement>(null);

  const generated = s.draftFor(tone);
  const draft = edited ?? generated;
  const used = xLength(draft);
  const over = used > X_LIMIT;
  const postWithLink = `${draft}\n\n${s.reportUrl}`;

  const pickTone = (next: ShareTone) => {
    setTone(next);
    setEdited(null);
  };

  return (
    <div className={styles.composer} role="group" aria-label="Share this roast">
      <div className={styles.post}>
        <div className={styles.toolbar}>
          <span id={`${uid}-tone`} className={styles.label}>
            Tone
          </span>
          <div className={styles.chips} role="radiogroup" aria-labelledby={`${uid}-tone`}>
            {SHARE_TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={tone === t.id}
                className={`${styles.chip} ${tone === t.id ? styles.chipOn : ""}`}
                onClick={() => pickTone(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <label htmlFor={`${uid}-draft`} className={styles.srOnly}>
          Post draft
        </label>
        <textarea
          id={`${uid}-draft`}
          ref={draftRef}
          className={styles.draft}
          rows={5}
          value={draft}
          onChange={(e) => setEdited(e.target.value)}
          spellCheck
        />
        <div className={styles.meta}>
          <span className={`${styles.count} ${over ? styles.countOver : ""}`}>
            {used} / {X_LIMIT} on X
            {over ? <span className={styles.countNote}> · {used - X_LIMIT} over, X will cut it</span> : null}
          </span>
          {edited !== null ? (
            <button type="button" className={styles.textBtn} onClick={() => setEdited(null)}>
              Reset draft
            </button>
          ) : (
            <span className={styles.hint}>Edit it before you post.</span>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => s.shareX(draft)}>
            <XIcon />
            <span>Post on X</span>
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.secondary}`}
            onClick={() => s.shareLinkedIn(draft, draftRef)}
          >
            <LinkedInIcon />
            <span>LinkedIn</span>
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.secondary}`}
            onClick={() =>
              s.copy(postWithLink, { key: "post", title: "Post copied", description: "Draft and report link are on your clipboard.", fallback: draftRef })
            }
          >
            <MaterialIcon name={s.copied === "post" ? "check" : "content_copy"} size="sm" />
            <span>{s.copied === "post" ? "Copied" : "Copy post"}</span>
          </button>
          <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={s.downloadCard}>
            <MaterialIcon name="download" size="sm" />
            <span>Save card</span>
          </button>
          {s.canNativeShare ? (
            <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={() => s.shareNative(draft)}>
              <MaterialIcon name="share" size="sm" />
              <span>Share…</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.challenge}>
        <p className={styles.label} id={`${uid}-challenge`}>
          Challenge a friend
        </p>
        <p className={styles.challengeLede}>Send them your number. Their entry page shows it before they roast.</p>
        <textarea
          ref={challengeRef}
          className={`${styles.draft} ${styles.challengeText}`}
          rows={3}
          readOnly
          value={s.challengeText}
          aria-labelledby={`${uid}-challenge`}
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className={styles.challengeActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.secondary}`}
            onClick={() =>
              s.copy(s.challengeText, {
                key: "challenge",
                title: "Challenge copied",
                description: "Paste it to a friend.",
                fallback: challengeRef,
              })
            }
          >
            <MaterialIcon name={s.copied === "challenge" ? "check" : "swords"} size="sm" />
            <span>{s.copied === "challenge" ? "Copied" : "Copy challenge"}</span>
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.secondary}`}
            onClick={() => s.shareX(s.challengeMessage, s.challengeUrl)}
          >
            <XIcon />
            <span>Send on X</span>
          </button>
        </div>
      </div>
    </div>
  );
}
