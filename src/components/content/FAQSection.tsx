"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { FAQItem } from "@/content/types";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./content.module.css";

export interface FAQSectionProps {
  faqs?: FAQItem[];
  title?: string;
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Accordion inside one hairline container. Buttons carry aria-expanded/aria-controls; panels open and
 * close with a GSAP height + opacity tween. First question open, one open at a time. Panels stay in
 * the DOM (answers remain crawlable) and expand fully when JS is off via the noscript rule.
 */
export default function FAQSection({ faqs, title = "Frequently asked questions" }: FAQSectionProps) {
  const [open, setOpen] = useState<number | null>(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  useIsoLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panels.current.forEach((el, i) => {
      if (!el) return;
      const state = el.dataset.state ?? (i === 0 ? "open" : "closed");
      const want = open === i;
      if (want && state !== "open") {
        el.dataset.state = "open";
        gsap.killTweensOf(el);
        gsap.set(el, { visibility: "visible" });
        if (reduce) {
          gsap.set(el, { height: "auto", autoAlpha: 1 });
          return;
        }
        gsap.fromTo(
          el,
          { height: el.offsetHeight, autoAlpha: 0 },
          { height: "auto", autoAlpha: 1, duration: 0.42, ease: "power3.out" },
        );
      } else if (!want && state === "open") {
        el.dataset.state = "closed";
        gsap.killTweensOf(el);
        const done = () => {
          gsap.set(el, { visibility: "hidden", height: 0 });
        };
        if (reduce) return done();
        gsap.to(el, { height: 0, autoAlpha: 0, duration: 0.32, ease: "power2.inOut", onComplete: done });
      }
    });
  }, [open]);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section className={styles.faqSection} aria-labelledby="faq">
      <noscript>
        <style>{`.${styles.faqPanel}{height:auto!important;visibility:visible!important;opacity:1!important}`}</style>
      </noscript>
      <h2 id="faq" className={styles.faqHeading}>{title}</h2>
      <div className={styles.faqList} data-reveal-group>
        {faqs.map((faq, idx) => {
          const isOpen = open === idx;
          return (
            <div key={idx} className={styles.faqItem} data-open={isOpen} data-reveal-item>
              <h3 className={styles.faqHead}>
                <button
                  type="button"
                  id={`faq-q-${idx}`}
                  className={styles.faqQuestion}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${idx}`}
                  onClick={() => setOpen(isOpen ? null : idx)}
                >
                  <span>{faq.question}</span>
                  <MaterialIcon name="expand_more" className={styles.faqChevron} />
                </button>
              </h3>
              <div
                ref={(el) => {
                  panels.current[idx] = el;
                }}
                id={`faq-a-${idx}`}
                role="region"
                aria-labelledby={`faq-q-${idx}`}
                className={`${styles.faqPanel} ${idx === 0 ? "" : styles.faqPanelClosed}`}
              >
                <div className={styles.faqAnswer}>{faq.answer}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
