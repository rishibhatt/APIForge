"use client";

import { useEffect } from "react";
import { whenHuman } from "@/lib/analytics/human-gate";

interface MicrosoftClarityProps {
  projectId?: string;
}

type ClarityWindow = Window & { clarity?: ((...args: unknown[]) => void) & { q?: unknown[] } };

/** Clarity tag, injected only after the visitor passes the human gate. */
export function MicrosoftClarity({
  projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "yp9y7a2gei",
}: MicrosoftClarityProps) {
  useEffect(() => {
    if (!projectId) return;
    void whenHuman().then(() => {
      const w = window as ClarityWindow;
      if (w.clarity) return;
      const clarity = ((...args: unknown[]) => {
        (clarity.q = clarity.q || []).push(args);
      }) as NonNullable<ClarityWindow["clarity"]>;
      w.clarity = clarity;

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.clarity.ms/tag/${projectId}`;
      document.head.appendChild(script);
    });
  }, [projectId]);

  return null;
}
