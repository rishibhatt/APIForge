"use client";

import Link from "next/link";
import { useAiUsage } from "@/hooks/useAiUsage";
import { SUPPORT_PATH } from "@/lib/ai/usage-types";
import styles from "./AiLimitBanner.module.css";

const LOW_THRESHOLD = 8;

interface AiLimitBannerProps {
  className?: string;
}

/** One quiet line with the visitor's remaining AI requests. Louder only when the quota runs low. */
export default function AiLimitBanner({ className = "" }: AiLimitBannerProps) {
  const { limit, remaining, resetIn, known, exhausted } = useAiUsage();
  if (!known) return null;

  const tone = exhausted ? "out" : remaining <= LOW_THRESHOLD ? "low" : "ok";
  const pct = limit > 0 ? Math.max(0, Math.min(100, (remaining / limit) * 100)) : 0;
  const toneClass = tone === "out" ? styles.out : tone === "low" ? styles.low : "";

  return (
    <div
      className={`${styles.banner} ${toneClass} ${className}`.trim()}
      role={tone === "ok" ? undefined : "status"}
    >
      <div className={styles.row}>
        <p className={styles.text}>
          {exhausted ? (
            <>
              No AI requests left{resetIn ? <> · resets in <span className={styles.num}>{resetIn}</span></> : null}
            </>
          ) : (
            <>
              <span className={styles.num}>{remaining}</span> of <span className={styles.num}>{limit}</span> AI
              requests left
              {resetIn ? <> · resets in <span className={styles.num}>{resetIn}</span></> : null}
            </>
          )}
        </p>
        <Link href={SUPPORT_PATH} className={`${styles.link} focusRing`}>
          Why is there a limit?
        </Link>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="AI requests remaining"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={remaining}
      >
        <span className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
