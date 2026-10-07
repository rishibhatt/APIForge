"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportFaq } from "@/lib/support/faq";
import styles from "./Support.module.css";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function FaqAccordion({ items }: { items: SupportFaq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const first = useRef(true);
  const prev = useRef<number | null>(0);

  // Height animates with GSAP. Closed panels are visibility:hidden so they leave the tab order.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;
      const dur = prefersReducedMotion() ? 0 : 0.35;
      panels.current.forEach((el, i) => {
        if (!el) return;
        const shouldOpen = open === i;
        const wasOpen = prev.current === i;
        if (first.current) {
          gsap.set(el, { height: shouldOpen ? "auto" : 0, autoAlpha: shouldOpen ? 1 : 0 });
          return;
        }
        if (shouldOpen && !wasOpen) {
          gsap.killTweensOf(el);
          gsap.to(el, { height: "auto", autoAlpha: 1, duration: dur, ease: "expo.out" });
        } else if (!shouldOpen && wasOpen) {
          gsap.killTweensOf(el);
          gsap.to(el, { height: 0, autoAlpha: 0, duration: dur, ease: "expo.out" });
        }
      });
      first.current = false;
      prev.current = open;
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const toggle = useCallback((i: number) => setOpen((cur) => (cur === i ? null : i)), []);

  return (
    <div className={styles.faqList}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.question} className={styles.faqItem}>
            <h3 className={styles.faqHeading}>
              <button
                type="button"
                className={styles.faqTrigger}
                aria-expanded={isOpen}
                aria-controls={`support-faq-${i}`}
                id={`support-faq-trigger-${i}`}
                onClick={() => toggle(i)}
              >
                <span>{item.question}</span>
                <span className={styles.faqMark} aria-hidden />
              </button>
            </h3>
            <div
              ref={(el) => {
                panels.current[i] = el;
              }}
              id={`support-faq-${i}`}
              role="region"
              aria-labelledby={`support-faq-trigger-${i}`}
              className={`${styles.faqPanel} ${i === 0 ? "" : styles.faqPanelClosed}`}
            >
              <p className={styles.faqAnswer}>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
