"use client";

import { useEffect, useState } from "react";
import styles from "./RoastProgress.module.css";

const PROGRESS_STEPS = [
  { prefix: "01", text: "Reading your endpoints...", doneText: "endpoints indexed" },
  { prefix: "02", text: "Inspecting your naming choices...", doneText: "naming analyzed" },
  { prefix: "03", text: "Checking your HTTP crimes...", doneText: "semantics evaluated" },
  { prefix: "04", text: "Measuring documentation damage...", doneText: "coverage measured" },
  { prefix: "05", text: "Consulting the engineering tribunal...", doneText: "findings aggregated" },
  { prefix: "06", text: "Preparing emotional damage...", doneText: "verdict sealed" },
];

export interface RoastProgressProps {
  endpointsCount?: number;
  onComplete?: () => void;
}

export default function RoastProgress({
  endpointsCount,
  onComplete,
}: RoastProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [verdictReady, setVerdictReady] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < PROGRESS_STEPS.length - 1) {
          setCompletedSteps((done) => [...done, prev]);
          return prev + 1;
        } else {
          clearInterval(interval);
          setCompletedSteps((done) => [...done, prev]);
          setVerdictReady(true);
          if (onComplete) {
            setTimeout(onComplete, 600);
          }
          return prev;
        }
      });
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={styles.terminal}>
      <div className={styles.header}>
        <div className={styles.dotRed} />
        <div className={styles.dotYellow} />
        <div className={styles.dotGreen} />
        <span className={styles.title}>ENGINEERING TRIBUNAL • AUDITING SPEC</span>
      </div>

      <div className={styles.body}>
        {PROGRESS_STEPS.slice(0, currentStepIndex + 1).map((step, idx) => {
          const isDone = completedSteps.includes(idx);
          const isCurrent = idx === currentStepIndex && !verdictReady;

          let doneLabel = step.doneText;
          if (idx === 0 && endpointsCount && endpointsCount > 0) {
            doneLabel = `${endpointsCount} endpoints indexed`;
          }

          return (
            <div
              key={step.text}
              className={`${styles.line} ${isCurrent ? styles.lineActive : ""}`}
            >
              <span className={styles.numPrefix}>{step.prefix}</span>
              <span className={styles.stepText}>{step.text}</span>
              {isDone && doneLabel ? (
                <span className={styles.check}>✓ {doneLabel}</span>
              ) : null}
            </div>
          );
        })}

        {verdictReady ? (
          <div className={styles.accentLine}>
            <span>VERDICT READY.</span>
            <span className={styles.cursor} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
