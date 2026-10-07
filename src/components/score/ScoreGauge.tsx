"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import styles from "./ScoreGauge.module.css";

const R = 80;
const CIRC = 2 * Math.PI * R;
/** The visible arc is 270 degrees (three quarters of the circle). */
const ARC = CIRC * 0.75;
const START_DEG = 135;

export interface ScoreGaugeProps {
  /** 0 to 100. */
  score: number;
  /** Grade letter shown in the gap at the bottom of the arc. */
  grade: string;
  /** Any CSS color; default is the primary token. Tier colors come from the caller (tokens). */
  tone?: string;
  /** Animate the arc and count-up on mount. Reduced motion always shows final values. */
  animate?: boolean;
  /** Seconds before the sweep starts. */
  delay?: number;
  /** Sweep duration in seconds. */
  duration?: number;
  /** Override the accessible label. Default: "Score 86 out of 100, grade B". */
  ariaLabel?: string;
  className?: string;
}

const TICKS = Array.from({ length: 21 }, (_, i) => i * 5);

function polar(value: number, r: number) {
  const a = ((START_DEG + value * 2.7) * Math.PI) / 180;
  return { x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) };
}

export default function ScoreGauge({
  score,
  grade,
  tone = "var(--color-primary)",
  animate = true,
  delay = 0.1,
  duration = 1.4,
  ariaLabel,
  className = "",
}: ScoreGaugeProps) {
  const arcRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const final = Math.min(100, Math.max(0, Math.round(score)));

  useEffect(() => {
    const arc = arcRef.current;
    const num = numRef.current;
    if (!arc || !num) return;
    const setTo = (v: number) => {
      arc.style.strokeDashoffset = String(ARC * (1 - v / 100));
      num.textContent = String(Math.round(v));
    };
    if (!animate || reduced) {
      setTo(final);
      return;
    }
    const proxy = { v: 0 };
    setTo(0);
    const tween = gsap.to(proxy, {
      v: final,
      duration,
      delay,
      ease: "power3.out",
      onUpdate: () => setTo(proxy.v),
      onComplete: () => setTo(final),
    });
    return () => {
      tween.kill();
    };
  }, [final, animate, reduced, delay, duration]);

  const label = ariaLabel ?? `Score ${final} out of 100, grade ${grade}`;

  return (
    <div className={`${styles.gauge} ${className}`.trim()} style={{ ["--gauge-tone" as string]: tone }}>
      <svg viewBox="0 0 200 200" role="img" aria-label={label} className={styles.svg}>
        <g className={styles.ticks} aria-hidden>
          {TICKS.map((v) => {
            const major = v % 25 === 0;
            const a = polar(v, major ? 86 : 89);
            const b = polar(v, 94);
            return (
              <line
                key={v}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={major ? styles.tickMajor : styles.tickMinor}
              />
            );
          })}
        </g>
        <circle
          cx="100"
          cy="100"
          r={R}
          className={styles.track}
          strokeDasharray={`${ARC} ${CIRC}`}
          transform={`rotate(${START_DEG} 100 100)`}
        />
        <circle
          ref={arcRef}
          cx="100"
          cy="100"
          r={R}
          className={styles.arc}
          strokeDasharray={`${ARC} ${CIRC}`}
          style={{ strokeDashoffset: ARC * (1 - final / 100) }}
          transform={`rotate(${START_DEG} 100 100)`}
        />
      </svg>
      <div className={styles.center} aria-hidden>
        <span className={styles.num}>
          <span ref={numRef}>{final}</span>
        </span>
        <span className={styles.denom}>/100</span>
      </div>
      <span className={styles.grade} aria-hidden>
        {grade}
      </span>
    </div>
  );
}
