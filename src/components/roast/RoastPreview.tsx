"use client";

import { useEffect, useRef } from "react";
import type { RoastStatusTier } from "@/lib/roast/types";
import { TIER_LABELS, tierFromScore, tierTone } from "./labels";
import styles from "./RoastPreview.module.css";

interface Example {
  score: number;
  method: string;
  path: string;
  /** The one-liner in three runs so the route renders as code: before, code, after. */
  line: [string, string, string];
}

/** Sentence shapes taken from src/lib/roast/roastTemplates.ts. Every example is invented. */
const EXAMPLES: Example[] = [
  {
    score: 34,
    method: "POST",
    path: "/getUserOrders",
    line: [
      "",
      "POST /getUserOrders",
      " puts the verb in the URL, which is like labelling a door \"DOOR\". HTTP methods already exist. They were here first.",
    ],
  },
  {
    score: 58,
    method: "GET",
    path: "/orders/search",
    line: [
      "A GET with a body. ",
      "GET /orders/search",
      " works on localhost. It will not work behind a CDN, a cache, or on a Tuesday.",
    ],
  },
  {
    score: 79,
    method: "PATCH",
    path: "/invoices/{id}",
    line: ["", "PATCH /invoices/{id}", " has no error responses. Optimism is not a schema."],
  },
];

const HOLD_S = 2.5;
const CHARS_PER_S = 48;

function describe(ex: Example): { tier: RoastStatusTier; tone: string } {
  const tier = tierFromScore(ex.score);
  return { tier, tone: tierTone(tier) };
}

/**
 * One card that cycles through three example roasts: the score counts up, the tier stamp lands,
 * the one-liner types in, then it holds and fades to the next. It only runs while on screen and
 * never under prefers-reduced-motion (the first example is shown as-is, which is also the SSR output).
 * DOM updates are imperative on purpose: GSAP owns the text nodes, React renders example one once.
 */
export default function RoastPreview() {
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const stampRef = useRef<HTMLSpanElement>(null);
  const segRefs = useRef<(HTMLElement | null)[]>([]);
  const methodRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<HTMLSpanElement>(null);
  const srRef = useRef<HTMLParagraphElement>(null);
  const dotRefs = useRef<(HTMLElement | null)[]>([]);

  const first = EXAMPLES[0]!;
  const firstMeta = describe(first);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = cardRef.current;
    if (!card) return;

    let cancelled = false;
    let observer: IntersectionObserver | undefined;
    let master: { kill: () => void; play: () => void; pause: () => void } | undefined;

    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;

      const segs = () => segRefs.current;

      const setup = (i: number) => {
        const ex = EXAMPLES[i]!;
        const meta = describe(ex);
        card.dataset.tone = meta.tone;
        if (numRef.current) numRef.current.textContent = "0";
        if (stampRef.current) {
          stampRef.current.textContent = TIER_LABELS[meta.tier];
          gsap.set(stampRef.current, { autoAlpha: 0, scale: 1.7, rotation: -14 });
        }
        segs().forEach((el) => {
          if (el) el.textContent = "";
        });
        if (methodRef.current) methodRef.current.textContent = ex.method;
        if (pathRef.current) pathRef.current.textContent = ex.path;
        if (srRef.current) srRef.current.textContent = `Example roast, score ${ex.score} out of 100, ${TIER_LABELS[meta.tier]}. ${ex.line.join("")}`;
        dotRefs.current.forEach((d, n) => {
          if (d) d.dataset.active = n === i ? "true" : "false";
        });
      };

      const tl = gsap.timeline({ paused: true, repeat: -1 });
      EXAMPLES.forEach((ex, i) => {
        const total = ex.line.join("").length;
        const typeS = total / CHARS_PER_S;
        const score = { v: 0 };
        const typed = { n: 0 };

        tl.to({}, { duration: 0.02 });
        tl.call(setup, [i]);
        tl.set(score, { v: 0 });
        tl.set(typed, { n: 0 });
        tl.fromTo(bodyRef.current, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" });
        tl.to(score, {
          v: ex.score,
          duration: 0.9,
          ease: "power3.out",
          onUpdate: () => {
            if (numRef.current) numRef.current.textContent = String(Math.round(score.v));
          },
        });
        tl.to(stampRef.current, { autoAlpha: 1, scale: 1, rotation: -6, duration: 0.36, ease: "power2.out" }, ">-0.05");
        tl.to(typed, {
          n: total,
          duration: typeS,
          ease: "none",
          onUpdate: () => {
            let left = Math.round(typed.n);
            segs().forEach((el, n) => {
              if (!el) return;
              const text = ex.line[n] ?? "";
              el.textContent = text.slice(0, Math.max(0, left));
              left -= text.length;
            });
          },
        });
        tl.to({}, { duration: HOLD_S });
        tl.to(bodyRef.current, { autoAlpha: 0, y: -8, duration: 0.3, ease: "power2.in" });
      });

      master = tl;
      setup(0);

      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          if (entry.isIntersecting) tl.play();
          else tl.pause();
        },
        { threshold: 0.35 },
      );
      observer.observe(card);
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      master?.kill();
    };
  }, []);

  return (
    <div ref={cardRef} className={styles.card} data-tone={firstMeta.tone}>
      <div className={styles.top}>
        <span className={styles.label}>Example roast</span>
        <span className={styles.dots} aria-hidden>
          {EXAMPLES.map((ex, i) => (
            <span
              key={ex.path}
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              className={styles.dot}
              data-active={i === 0 ? "true" : "false"}
            />
          ))}
        </span>
      </div>

      <p ref={srRef} className={styles.srOnly}>
        {`Example roast, score ${first.score} out of 100, ${TIER_LABELS[firstMeta.tier]}. ${first.line.join("")}`}
      </p>

      <div ref={bodyRef} className={styles.body} aria-hidden>
        <div className={styles.head}>
          <p className={styles.score}>
            <span ref={numRef} className={styles.num}>
              {first.score}
            </span>
            <span className={styles.denom}>/100</span>
          </p>
          <span ref={stampRef} className={styles.stamp}>
            {TIER_LABELS[firstMeta.tier]}
          </span>
        </div>

        <p className={styles.line}>
          <span
            ref={(el) => {
              segRefs.current[0] = el;
            }}
          >
            {first.line[0]}
          </span>
          <code
            ref={(el) => {
              segRefs.current[1] = el;
            }}
            className={styles.code}
          >
            {first.line[1]}
          </code>
          <span
            ref={(el) => {
              segRefs.current[2] = el;
            }}
          >
            {first.line[2]}
          </span>
        </p>

        <p className={styles.route}>
          <span ref={methodRef} className={styles.method}>
            {first.method}
          </span>
          <span ref={pathRef} className={styles.path}>
            {first.path}
          </span>
        </p>
      </div>

      <p className={styles.foot}>Invented routes · rule-based score</p>
    </div>
  );
}
