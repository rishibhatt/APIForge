"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through status lines while `active`, holding on the last one. Used before the first token
 * so the wait reads as work in progress ("Reading the POST /pet contract…").
 */
export function useProgressStatus(active: boolean, steps: string[], intervalMs = 2600): string {
  const [index, setIndex] = useState(0);
  const count = steps.length;

  useEffect(() => {
    setIndex(0);
    if (!active || count < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i < count - 1 ? i + 1 : i));
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, count, intervalMs]);

  return steps[Math.min(index, count - 1)] ?? "";
}
