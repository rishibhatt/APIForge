"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { TranslateFn } from "@/context/LanguageContext";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./QualityScoreTeaser.module.css";

function tx(t: TranslateFn, key: string, fallback: string): string {
  const out = t(key);
  return out === key ? fallback : out;
}

const R = 18;
const CIRC = 2 * Math.PI * R;
/** Plausible two-digit scores the dial cycles through while it is "scanning". */
const FLICKER = ["72", "58", "91", "64", "83", "47", "76", "88"];

export default function QualityScoreTeaser({ t }: { t: TranslateFn }) {
  const setOpen = useWorkspaceStore((s) => s.setQualityScoreModalOpen);
  const endpointCount = useWorkspaceStore((s) => s.endpoints.length);

  const rootRef = useRef<HTMLButtonElement>(null);
  const sweepRef = useRef<SVGGElement>(null);
  const digitsRef = useRef<HTMLSpanElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const sweep = sweepRef.current;
    const digits = digitsRef.current;
    const shine = shineRef.current;
    if (!root || !sweep || !digits || !shine) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      digits.textContent = "?";
      return;
    }

    const spin = gsap.to(sweep, {
      rotation: 360,
      svgOrigin: "22 22",
      duration: 2.2,
      ease: "none",
      repeat: -1,
    });
    // Soft diagonal highlight across the whole banner, then a ~6s rest.
    gsap.set(shine, { xPercent: -130 });
    const shimmer = gsap.timeline({ repeat: -1, repeatDelay: 6, delay: 1.2 });
    shimmer.to(shine, { xPercent: 130, duration: 1.1, ease: "power2.inOut" });

    let i = 0;
    let tick: number | undefined;
    const startFlicker = () => {
      if (tick !== undefined) return;
      tick = window.setInterval(() => {
        // Alternate "?" with plausible numbers so it reads as a gauge hunting for a value.
        digits.textContent = i % 3 === 0 ? "?" : (FLICKER[i % FLICKER.length] ?? "?");
        i += 1;
      }, 340);
    };
    const stopFlicker = () => {
      if (tick !== undefined) window.clearInterval(tick);
      tick = undefined;
    };

    let onScreen = true;
    const sync = () => {
      const run = onScreen && !document.hidden;
      if (run) {
        spin.resume();
        shimmer.resume();
        startFlicker();
      } else {
        spin.pause();
        shimmer.pause();
        stopFlicker();
      }
    };
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? true;
      sync();
    });
    io.observe(root);
    document.addEventListener("visibilitychange", sync);

    const speedUp = () => gsap.to(spin, { timeScale: 3.2, duration: 0.3, overwrite: true });
    const slowDown = () => gsap.to(spin, { timeScale: 1, duration: 0.5, overwrite: true });
    root.addEventListener("pointerenter", speedUp);
    root.addEventListener("pointerleave", slowDown);
    root.addEventListener("focus", speedUp);
    root.addEventListener("blur", slowDown);
    sync();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      root.removeEventListener("pointerenter", speedUp);
      root.removeEventListener("pointerleave", slowDown);
      root.removeEventListener("focus", speedUp);
      root.removeEventListener("blur", slowDown);
      stopFlicker();
      spin.kill();
      shimmer.kill();
      gsap.killTweensOf(spin);
    };
  }, []);

  const headline = tx(t, "qualityScore.teaser.title", "Is your API any good? Get its score");
  const checks = tx(t, "qualityScore.teaser.checks", "Seven rule-based checks, scored right here in your browser.");
  const ready =
    endpointCount > 0
      ? tx(t, "qualityScore.teaser.ready", "{n} endpoints ready to grade.").replace("{n}", String(endpointCount))
      : null;

  return (
    <button
      ref={rootRef}
      type="button"
      className={`${styles.teaser} focusRing`}
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
      aria-expanded={false}
    >
      <span className={styles.shine} ref={shineRef} aria-hidden />
      <svg className={styles.dial} viewBox="0 0 44 44" aria-hidden focusable="false">
        <circle cx="22" cy="22" r={R} className={styles.dialTrack} />
        <g ref={sweepRef}>
          <circle
            cx="22"
            cy="22"
            r={R}
            className={styles.dialArc}
            strokeDasharray={`${CIRC * 0.28} ${CIRC}`}
            transform="rotate(-90 22 22)"
          />
        </g>
      </svg>
      <span className={styles.dialNum} aria-hidden>
        <span ref={digitsRef}>?</span>
      </span>
      <span className={styles.copy}>
        <span className={styles.headline}>{headline}</span>
        <span className={styles.sub}>
          {ready ? `${ready} ` : ""}
          {checks}
        </span>
      </span>
      <span className={styles.cta}>
        <span className={styles.ctaText}>{tx(t, "qualityScore.teaser.ctaCheck", "Check score")}</span>
        <MaterialIcon name="arrow_forward" size="sm" className={styles.arrow} />
      </span>
    </button>
  );
}
