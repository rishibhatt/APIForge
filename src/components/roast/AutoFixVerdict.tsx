"use client";

import { useEffect, useRef, useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./AutoFixVerdict.module.css";

export interface AutoFixVerdictProps {
  score: number;
  onReset?: () => void;
  onOpenWorkspace?: () => void;
}

export default function AutoFixVerdict({
  score,
  onReset,
  onOpenWorkspace,
}: AutoFixVerdictProps) {
  const targetPotentialScore = Math.min(98, Math.max(score + 35, 82));
  const [animatedPotential, setAnimatedPotential] = useState(score);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let animationStarted = false;

    const startAnimation = () => {
      if (animationStarted) return;
      animationStarted = true;

      const duration = 1400; // ms
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.round(score + (targetPotentialScore - score) * eased);

        setAnimatedPotential(currentVal);

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          startAnimation();
        }
      },
      { threshold: 0.3 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [score, targetPotentialScore]);

  const currentPct = Math.min(100, Math.max(0, score));
  const potentialPct = Math.min(100, Math.max(0, animatedPotential));

  return (
    <section ref={containerRef} className={styles.container}>
      <div className={styles.contentInner}>
        <span className={styles.kicker}>THERE IS HOPE.</span>

        <h3 className={styles.title}>YOUR API ISN&apos;T DOOMED.</h3>
        <p className={styles.subtitle}>
          It just needs some adult supervision and a few deterministic fixes.
        </p>

        {/* Score Transformation Card */}
        <div className={styles.transformBox}>
          <div className={styles.scoreCompareRow}>
            <div className={styles.scoreCol}>
              <span className={styles.scoreNumCurrent}>{score}</span>
              <span className={styles.scoreColLabel}>CURRENT</span>
            </div>

            <div className={styles.arrowCol}>
              <MaterialIcon name="arrow_forward" className={styles.arrowIcon} />
            </div>

            <div className={styles.scoreCol}>
              <span className={styles.scoreNumPotential}>{animatedPotential}</span>
              <span className={styles.scoreColLabel}>POTENTIAL</span>
            </div>
          </div>

          {/* Progress Bar Leap */}
          <div className={styles.progressWrap}>
            <div className={styles.barTrack}>
              <div
                className={styles.barFillCurrent}
                style={{ width: `${currentPct}%` }}
              />
              <div
                className={styles.barFillPotential}
                style={{ width: `${potentialPct}%` }}
              />
            </div>
            <div className={styles.barLegend}>
              <span>APIForge Auto-Fix Projection</span>
              <span>+{animatedPotential - score} PTS</span>
            </div>
          </div>
        </div>

        {/* CTA Row */}
        <div className={styles.buttonRow}>
          {onOpenWorkspace ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onOpenWorkspace}
            >
              <MaterialIcon name="build" size="sm" />
              <span>OPEN IN APIFORGE WORKSPACE</span>
            </button>
          ) : (
            <a href="/" className={styles.primaryBtn}>
              <MaterialIcon name="build" size="sm" />
              <span>OPEN IN APIFORGE WORKSPACE</span>
            </a>
          )}

          {onReset ? (
            <button type="button" className={styles.secondaryBtn} onClick={onReset}>
              <MaterialIcon name="refresh" size="sm" />
              <span>ROAST ANOTHER API</span>
            </button>
          ) : null}
        </div>

        <div className={styles.brandFooter}>
          Powered by APIForge • Deterministic OpenAPI rules &amp; instant workspace fixes.
        </div>
      </div>
    </section>
  );
}
