"use client";

import { useEffect, useState } from "react";
import type { ApiScoreBreakdown } from "@/lib/api-quality-score/types";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

const ZERO: ApiScoreBreakdown = {
  naming: 0,
  http: 0,
  structure: 0,
  consistency: 0,
  versioning: 0,
  errorHandling: 0,
  documentation: 0,
};

/**
 * Animates toward targets over `durationMs`.
 */
export function useAnimatedScoreNumbers(
  totalTarget: number,
  breakdownTarget: ApiScoreBreakdown,
  durationMs: number,
  enabled: boolean,
): { total: number; breakdown: ApiScoreBreakdown } {
  const [total, setTotal] = useState(enabled ? 0 : Math.round(totalTarget));
  const [breakdown, setBreakdown] = useState<ApiScoreBreakdown>(() =>
    enabled ? { ...ZERO } : breakdownTarget,
  );

  useEffect(() => {
    if (!enabled) {
      setTotal(Math.round(totalTarget));
      setBreakdown(breakdownTarget);
      return;
    }

    let start: number | null = null;
    let frame = 0;

    const keys = [
      "naming",
      "http",
      "structure",
      "consistency",
      "versioning",
      "errorHandling",
      "documentation",
    ] as const;

    const tick = (now: number) => {
      if (start === null) start = now;
      const raw = Math.min(1, (now - start) / durationMs);
      const p = easeOutCubic(raw);

      setTotal(Math.round(totalTarget * p));
      setBreakdown(() => {
        const next = { ...ZERO };
        for (const k of keys) {
          next[k] = Math.round(breakdownTarget[k] * p * 10) / 10;
        }
        return next;
      });

      if (raw < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setTotal(Math.round(totalTarget));
        setBreakdown(breakdownTarget);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [totalTarget, breakdownTarget, durationMs, enabled]);

  return { total, breakdown };
}
