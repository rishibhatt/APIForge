"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./StickyShowcase.module.css";

export interface ShowcaseItem {
  id: string;
  title: string;
  body: string;
}

export interface StickyShowcaseProps {
  items: ShowcaseItem[];
  /** Desktop: the one sticky panel. Re-render per active item; animate inside with your own effects. */
  renderVisual: (active: number) => ReactNode;
  /** Mobile (<900px): a static visual shown under each item instead of the sticky panel. */
  renderInline: (index: number) => ReactNode;
  /** Called as the list scrolls through the viewport (0 to 1). Touch the DOM directly; do not set React state here. */
  onProgress?: (progress: number) => void;
  /** Accessible name for the list. */
  label: string;
}

/**
 * The shared landing layout, modelled on the roast page's "What comes back" list:
 * hairline-divided items on the left, one sticky visual on the right that follows the item in focus.
 * GSAP ScrollTrigger (loaded on demand) tracks which item sits at the reading line.
 * Under 900px or with reduced motion, the list stands alone with a static visual under each item.
 */
export default function StickyShowcase({ items, renderVisual, renderInline, onProgress, label }: StickyShowcaseProps) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let cancelled = false;
    let revert: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        const lis = Array.from(list.children) as HTMLElement[];
        lis.forEach((li, i) => {
          ScrollTrigger.create({
            trigger: li,
            start: "top 62%",
            end: "bottom 62%",
            onToggle: (self) => {
              if (self.isActive) setActive(i);
            },
          });
        });
        ScrollTrigger.create({
          trigger: list,
          start: "top 70%",
          end: "bottom 50%",
          onUpdate: (self) => progressRef.current?.(self.progress),
        });
      });
      revert = () => mm.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <ol ref={listRef} className={styles.list} aria-label={label}>
        {items.map((item, i) => (
          <li key={item.id} className={`${styles.item} ${i === active ? styles.itemOn : ""}`}>
            <div className={styles.text}>
              <h3 className={styles.title}>{item.title}</h3>
              <p className={styles.body}>{item.body}</p>
            </div>
            <div className={styles.inline}>{renderInline(i)}</div>
          </li>
        ))}
      </ol>
      <div className={styles.panel} aria-hidden>
        {renderVisual(active)}
      </div>
    </div>
  );
}
