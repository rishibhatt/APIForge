"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./ChallengeBanner.module.css";

export interface ChallengeBannerProps {
  /** Friend's API title. Plain text, already trimmed; may be empty. */
  from: string;
  /** Friend's score, integer 0-100. */
  beat: number;
  onDismiss?: () => void;
}

function storageKey(beat: number, from: string): string {
  return `roast-challenge-dismissed:${beat}:${from}`;
}

export default function ChallengeBanner({ from, beat, onDismiss }: ChallengeBannerProps) {
  const [hidden, setHidden] = useState(false);
  const fillRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(storageKey(beat, from)) === "1") setHidden(true);
    } catch {
      // Storage can be blocked; the banner simply stays visible.
    }
  }, [beat, from]);

  useEffect(() => {
    const el = fillRef.current;
    if (!el || hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.fromTo(el, { scaleX: 0 }, { scaleX: beat / 100, duration: 0.8, ease: "power3.out", delay: 0.15 });
    return () => {
      tween.kill();
    };
  }, [beat, hidden]);

  if (hidden) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(storageKey(beat, from), "1");
    } catch {
      // Ignore: dismissal just won't persist across reloads.
    }
    setHidden(true);
    onDismiss?.();
  };

  return (
    <aside className={styles.banner} aria-label="Roast challenge">
      <div className={styles.body}>
        <p className={styles.text}>
          {from ? (
            <>
              A friend&apos;s API (<span className={styles.from}>{from}</span>) scored{" "}
            </>
          ) : (
            <>A friend&apos;s API scored </>
          )}
          <strong className={styles.score}>{beat}/100</strong>. Can yours beat it?
        </p>
        <span
          className={styles.track}
          role="img"
          aria-label={`Friend's score: ${beat} out of 100`}
        >
          <span ref={fillRef} className={styles.fill} style={{ transform: `scaleX(${beat / 100})` }} />
        </span>
      </div>
      <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss challenge">
        <MaterialIcon name="close" size="sm" />
      </button>
    </aside>
  );
}
