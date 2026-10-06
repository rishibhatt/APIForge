"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import SectionHead from "../SectionHead";
import StickyShowcase, { type ShowcaseItem } from "../StickyShowcase";
import styles from "./ScoreDemoSection.module.css";

type Method = "GET" | "POST" | "DELETE";

interface DemoRow {
  group: number;
  method: Method;
  path: string;
  rule: string;
  fixedMethod: Method;
  fixedPath: string;
  fixedExtra?: string;
}

const ITEMS: ShowcaseItem[] = [
  { id: "naming", title: "Naming", body: "Verbs in paths, underscores, camelCase, and singular next to plural." },
  { id: "http", title: "HTTP semantics", body: "A GET with a request body, or the verb repeated in the method and the path." },
  { id: "responses", title: "Responses and errors", body: "No documented success response, and no error responses." },
  {
    id: "docs",
    title: "Docs and versions",
    body: "No summary or description, no version in the path, paths nested too deep, duplicate operations.",
  },
];

const ROWS: DemoRow[] = [
  { group: 0, method: "POST", path: "/getUserOrders", rule: "Verb in the path", fixedMethod: "GET", fixedPath: "/users/{id}/orders" },
  { group: 0, method: "GET", path: "/user_orders", rule: "Underscores in the path", fixedMethod: "GET", fixedPath: "/user-orders" },
  { group: 1, method: "GET", path: "/search", rule: "Request body on a GET", fixedMethod: "POST", fixedPath: "/search" },
  {
    group: 2,
    method: "DELETE",
    path: "/pets/{id}",
    rule: "No error responses",
    fixedMethod: "DELETE",
    fixedPath: "/pets/{id}",
    fixedExtra: "404, 409",
  },
  { group: 3, method: "GET", path: "/api/pets", rule: "No version in the path", fixedMethod: "GET", fixedPath: "/v1/pets" },
];

/* Real pillar weights (SCORE_CATEGORY_MAX, 100 total). Example values sum to 38 before and 86 after. */
const PILLARS = [
  { name: "Naming", max: 20, before: 8, after: 18 },
  { name: "HTTP semantics", max: 20, before: 7, after: 18 },
  { name: "Structure", max: 15, before: 9, after: 13 },
  { name: "Consistency", max: 15, before: 5, after: 12 },
  { name: "Versioning", max: 10, before: 1, after: 10 },
  { name: "Error handling", max: 10, before: 3, after: 8 },
  { name: "Documentation", max: 10, before: 5, after: 7 },
];
const LONGEST = 20;

const START_SCORE = 38;
const SCORES = [52, 66, 77, 86];

const METHOD_CLASS: Record<Method, string> = {
  GET: styles.mGet,
  POST: styles.mPost,
  DELETE: styles.mDelete,
};

function MethodChip({ method }: { method: Method }) {
  return <span className={`${styles.method} ${METHOD_CLASS[method]}`}>{method}</span>;
}

type Gsap = typeof import("gsap").gsap;

function q(row: Element, name: string) {
  return row.querySelector<HTMLElement>(`[data-el="${name}"]`);
}

/** Put one row into its final flagged or fixed state, no animation. */
function applyState(gsap: Gsap, row: Element, fixed: boolean) {
  gsap.set(q(row, "old"), { autoAlpha: fixed ? 0 : 1 });
  gsap.set(q(row, "strike"), { scaleX: fixed ? 1 : 0 });
  gsap.set(q(row, "new"), { clipPath: fixed ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" });
  gsap.set(q(row, "mOld"), { autoAlpha: fixed ? 0 : 1 });
  gsap.set(q(row, "mNew"), { autoAlpha: fixed ? 1 : 0 });
  gsap.set(q(row, "flag"), { autoAlpha: fixed ? 0 : 1 });
  gsap.set(q(row, "fix"), { autoAlpha: fixed ? 1 : 0 });
}

function ScoreVisual({ active }: { active: number }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef(START_SCORE);

  useEffect(() => {
    let cancelled = false;
    let ctx: { kill: () => void } | undefined;

    (async () => {
      const { gsap } = await import("gsap");
      const panel = panelRef.current;
      if (cancelled || !panel) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const rows = Array.from(panel.querySelectorAll<HTMLElement>("[data-row]"));
      const pre = active === 0 ? START_SCORE : SCORES[active - 1];
      const post = SCORES[active];
      const counter = { v: valueRef.current };
      const paint = () => {
        valueRef.current = counter.v;
        if (numRef.current) numRef.current.textContent = String(Math.round(counter.v));
        if (barRef.current) barRef.current.style.transform = `scaleX(${counter.v / 100})`;
      };

      ctx = gsap.context(() => {
        // Deterministic baseline: earlier groups fixed, active and later groups flagged.
        rows.forEach((row) => applyState(gsap, row, Number(row.dataset.group) < active));

        if (reduce) {
          rows.forEach((row) => applyState(gsap, row, Number(row.dataset.group) <= active));
          counter.v = post;
          paint();
          return;
        }

        const ease = "power2.out";
        const flipAt = 0.95;
        const tl = gsap.timeline();
        tl.to(counter, { v: pre, duration: 0.35, ease, onUpdate: paint, onComplete: paint });
        tl.to(counter, { v: post, duration: 0.9, ease, onUpdate: paint, onComplete: paint }, flipAt);
        rows
          .filter((row) => Number(row.dataset.group) === active)
          .forEach((row) => {
            tl.to(q(row, "strike"), { scaleX: 1, duration: 0.28, ease }, flipAt);
            tl.to(q(row, "new"), { clipPath: "inset(0 0% 0 0)", duration: 0.42, ease }, flipAt + 0.2);
            tl.to(q(row, "old"), { autoAlpha: 0, duration: 0.42, ease }, flipAt + 0.2);
            tl.to(q(row, "mOld"), { autoAlpha: 0, duration: 0.3 }, flipAt + 0.2);
            tl.to(q(row, "mNew"), { autoAlpha: 1, duration: 0.3 }, flipAt + 0.2);
            tl.to(q(row, "flag"), { autoAlpha: 0, duration: 0.3 }, flipAt + 0.2);
            tl.to(q(row, "fix"), { autoAlpha: 1, duration: 0.3 }, flipAt + 0.2);
          });
      }, panel);
    })();

    return () => {
      cancelled = true;
      ctx?.kill();
    };
  }, [active]);

  return (
    <div className={styles.panel} ref={panelRef}>
      <div className={styles.chrome}>
        <span className={styles.chromeLabel}>quality score · example</span>
        <span className={styles.tag}>Example</span>
      </div>

      <div className={styles.score}>
        <div className={styles.readout}>
          <span ref={numRef} className={styles.num}>
            {START_SCORE}
          </span>
          <span className={styles.outOf}>/100</span>
        </div>
        <div className={styles.track}>
          <span ref={barRef} className={styles.fill} style={{ transform: `scaleX(${START_SCORE / 100})` }} />
        </div>
      </div>

      <ul className={styles.rows}>
        {ROWS.map((r) => (
          <li key={r.path + r.group} className={styles.row} data-row data-group={r.group}>
            <span className={styles.stack}>
              <span data-el="mOld">
                <MethodChip method={r.method} />
              </span>
              <span data-el="mNew" className={styles.hidden}>
                <MethodChip method={r.fixedMethod} />
              </span>
            </span>
            <span className={styles.pathCell}>
              <span data-el="old" className={`${styles.path} ${styles.pathOld}`}>
                {r.path}
                <span data-el="strike" className={styles.strike} />
              </span>
              <span data-el="new" className={`${styles.path} ${styles.pathNew}`}>
                {r.fixedPath}
                {r.fixedExtra ? <span className={styles.extra}>+ {r.fixedExtra}</span> : null}
              </span>
            </span>
            <span className={styles.stateCell}>
              <span data-el="flag" className={`${styles.state} ${styles.stateFlag}`}>
                {r.rule}
              </span>
              <span data-el="fix" className={`${styles.state} ${styles.stateFix}`}>
                Fixed
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreInline({ index }: { index: number }) {
  const rows = ROWS.filter((r) => r.group === index);
  return (
    <div className={styles.inlineCard}>
      <div className={styles.chrome}>
        <span className={styles.chromeLabel}>{ITEMS[index].title} · example</span>
        <span className={styles.tag}>Example</span>
      </div>
      <ul className={styles.inlineRows}>
        {rows.map((r) => (
          <li key={r.path} className={styles.inlineRow}>
            <div className={styles.inlineLine}>
              <MethodChip method={r.method} />
              <span className={`${styles.path} ${styles.inlinePathBad}`}>{r.path}</span>
              <span className={`${styles.state} ${styles.stateFlag}`}>{r.rule}</span>
            </div>
            <div className={styles.inlineLine}>
              <MethodChip method={r.fixedMethod} />
              <span className={`${styles.path} ${styles.inlinePathGood}`}>
                {r.fixedPath}
                {r.fixedExtra ? <span className={styles.extra}>+ {r.fixedExtra}</span> : null}
              </span>
              <span className={`${styles.state} ${styles.stateFix} ${styles.stateOn}`}>Fixed</span>
            </div>
          </li>
        ))}
      </ul>
      <p className={styles.inlineScore}>
        Score after: <strong>{SCORES[index]}</strong>
        <span className={styles.inlineFrom}> (from {index === 0 ? START_SCORE : SCORES[index - 1]})</span>
      </p>
    </div>
  );
}

function Breakdown() {
  const panelRef = useRef<HTMLDivElement>(null);
  const totalBefore = PILLARS.reduce((s, p) => s + p.before, 0);
  const totalAfter = PILLARS.reduce((s, p) => s + p.after, 0);

  // Final state is the default markup and CSS. JS only replays the build-up once, when the panel scrolls into view.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;
    let cancelled = false;
    let kill: (() => void) | undefined;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        (async () => {
          const { gsap } = await import("gsap");
          if (cancelled) return;
          const q = <T extends HTMLElement>(sel: string) => Array.from(panel.querySelectorAll<T>(sel));
          const befores = q("[data-bar-before]");
          const afters = q("[data-bar-after]");
          const nums = q("[data-count]");
          const finals = nums.map((n) => Number(n.dataset.count));
          const ctx = gsap.context(() => {
            gsap.set([...befores, ...afters], { scaleX: 0 });
            nums.forEach((n) => {
              n.textContent = "0";
            });
            const tl = gsap.timeline({
              onComplete: () => nums.forEach((n, i) => (n.textContent = String(finals[i]))),
            });
            tl.to(befores, { scaleX: 1, duration: 0.9, ease: "power3.out", stagger: 0.08 }, 0);
            tl.to(afters, { scaleX: 1, duration: 0.9, ease: "power3.out", stagger: 0.08 }, 0.5);
            nums.forEach((n, i) => {
              const c = { v: 0 };
              const isAfter = n.hasAttribute("data-after");
              tl.to(
                c,
                {
                  v: finals[i],
                  duration: 0.9,
                  ease: "power3.out",
                  onUpdate: () => {
                    n.textContent = String(Math.round(c.v));
                  },
                },
                isAfter ? 0.5 : 0,
              );
            });
          }, panel);
          kill = () => ctx.kill();
        })();
      },
      { threshold: 0.35 },
    );
    io.observe(panel);

    return () => {
      cancelled = true;
      io.disconnect();
      kill?.();
    };
  }, []);

  return (
    <div className={styles.breakdown}>
      <div className={styles.breakdownCopy}>
        <h3 className={styles.breakdownTitle}>Where the 100 points come from</h3>
        <p className={styles.breakdownText}>
          Seven pillars share the 100 points, and each rule a route breaks takes points off its pillar. The rules are
          fixed, so the same spec always gets the same score.
        </p>
        <Link href="/api-score" className={styles.breakdownLink}>
          How the score works
        </Link>
      </div>

      <div className={styles.bpanel} ref={panelRef}>
        <div className={styles.chrome}>
          <span className={styles.chromeLabel}>score breakdown · example</span>
          <span className={styles.tag}>Example</span>
        </div>
        <div className={styles.bkey} aria-hidden>
          <span className={styles.bkeyItem}>
            <span className={`${styles.swatch} ${styles.swatchBefore}`} />
            Before
          </span>
          <span className={styles.bkeyItem}>
            <span className={`${styles.swatch} ${styles.swatchAfter}`} />
            After fixing
          </span>
        </div>
        <ul className={styles.bars}>
          {PILLARS.map((p) => (
            <li key={p.name} className={styles.bRow}>
              <span className={styles.bLabel}>{p.name}</span>
              <span className={styles.bArea}>
                <span className={styles.bTrack} style={{ width: `${(p.max / LONGEST) * 100}%` }}>
                  <span
                    data-bar-after
                    className={`${styles.bFill} ${styles.bAfter}`}
                    style={{ width: `${(p.after / p.max) * 100}%` }}
                  />
                  <span
                    data-bar-before
                    className={`${styles.bFill} ${styles.bBefore}`}
                    style={{ width: `${(p.before / p.max) * 100}%` }}
                  />
                </span>
              </span>
              <span className={styles.bNums}>
                <span className={styles.bFrom} data-count={p.before}>
                  {p.before}
                </span>
                <span className={styles.bArrow} aria-hidden>
                  {"→"}
                </span>
                <span className={styles.bTo} data-count={p.after} data-after>
                  {p.after}
                </span>
                <span className={styles.bMax}>/{p.max}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className={styles.bTotal}>
          <span className={styles.bTotalLabel}>Total</span>
          <span className={styles.bTotalNums}>
            <span className={styles.bFrom} data-count={totalBefore}>
              {totalBefore}
            </span>
            <span className={styles.bArrow} aria-hidden>
              {"→"}
            </span>
            <span className={styles.bTotalTo} data-count={totalAfter} data-after>
              {totalAfter}
            </span>
            <span className={styles.bMax}>/100</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ScoreDemoSection() {
  return (
    <section id="score-demo" className={styles.section} aria-labelledby="score-demo-heading">
      <div className={styles.inner}>
        <SectionHead
          id="score-demo-heading"
          title="See what the score catches"
          lede="Every route is checked against twelve rules. Fix a group and the score moves."
        />
        <p className={styles.srOnly}>Example: score rises from 38 to 86 as the four rule groups are fixed</p>
        <StickyShowcase
          label="Rule groups the quality score checks"
          items={ITEMS}
          renderVisual={(active) => <ScoreVisual active={active} />}
          renderInline={(i) => <ScoreInline index={i} />}
        />
        <Breakdown />
      </div>
    </section>
  );
}
