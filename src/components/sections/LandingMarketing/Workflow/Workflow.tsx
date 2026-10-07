"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import SectionHead from "../SectionHead";
import styles from "./Workflow.module.css";

type Gsap = (typeof import("gsap"))["gsap"];
type ScrollTriggerApi = (typeof import("gsap/ScrollTrigger"))["ScrollTrigger"];
type Method = "get" | "post" | "put" | "delete";

const STEPS = [
  { id: "paste", name: "Paste", body: "Drop in an OpenAPI or Swagger link. That is the whole setup." },
  { id: "parse", name: "Parse", body: "Paths, methods, tags, and schemas are read into a browsable list of endpoints." },
  { id: "run", name: "Run", body: "Pick an endpoint, fill in the parameters, and send a real request from the workspace." },
  { id: "validate", name: "Validate", body: "The response is checked against the schema the spec promised." },
  { id: "score", name: "Score", body: "Twelve rules grade the design of every route, so weak spots show up early." },
  { id: "export", name: "Export", body: "Take the result with you as types, a cURL command, or a Postman collection." },
] as const;

const BEATS = STEPS.length;
const LOOP_SECONDS = 14;
const SCENE_W = 820;
const URL_TEXT = "petstore.swagger.io/v2/swagger.json";
const REQ_BODY = '{\n  "name": "Rex",\n  "photoUrls": ["rex.jpg"],\n  "status": "available"\n}';
const RESP_BODY = '{\n  "id": 4021,\n  "name": "Rex",\n  "status": "available"\n}';

interface EndpointRow {
  m: Method;
  p: string;
  sel?: boolean;
}

interface Group {
  tag: string;
  count: number;
  rows: EndpointRow[];
  more: number;
}

const GROUPS: Group[] = [
  {
    tag: "pet",
    count: 8,
    rows: [
      { m: "post", p: "/pet", sel: true },
      { m: "put", p: "/pet" },
      { m: "get", p: "/pet/findByStatus" },
      { m: "get", p: "/pet/{petId}" },
    ],
    more: 4,
  },
  {
    tag: "store",
    count: 4,
    rows: [
      { m: "get", p: "/store/inventory" },
      { m: "post", p: "/store/order" },
    ],
    more: 2,
  },
  {
    tag: "user",
    count: 8,
    rows: [
      { m: "post", p: "/user" },
      { m: "get", p: "/user/login" },
    ],
    more: 6,
  },
];

const CHECKS = [
  { name: "name", type: "string" },
  { name: "photoUrls", type: "array" },
  { name: "status", type: "enum" },
];

const PILLARS = [
  { name: "Naming", v: 0.92 },
  { name: "HTTP semantics", v: 0.88 },
  { name: "Structure", v: 0.84 },
  { name: "Consistency", v: 0.9 },
  { name: "Versioning", v: 0.7 },
  { name: "Error handling", v: 0.78 },
  { name: "Documentation", v: 0.96 },
];

const FILES = ["Pet.ts", "pet.curl", "petstore.postman.json"];

const countLabel = (n: number) => {
  const tags = n <= 0 ? 0 : n <= 8 ? 1 : n <= 12 ? 2 : 3;
  return `${n} endpoint${n === 1 ? "" : "s"} · ${tags} tag${tags === 1 ? "" : "s"}`;
};

/**
 * Builds the single scrubbed (or looping) timeline for the scene.
 * Returns a cleanup that restores every DOM mutation made outside GSAP's own revert.
 */
function setup(
  gsap: Gsap,
  ScrollTrigger: ScrollTriggerApi,
  root: HTMLElement,
  mode: "pin" | "loop",
  vertical: boolean,
): () => void {
  const one = (k: string) => root.querySelector<HTMLElement>(`[data-wf="${k}"]`) as HTMLElement;
  const all = (k: string, scope: ParentNode = root) =>
    Array.from(scope.querySelectorAll<HTMLElement>(`[data-wf="${k}"]`));
  const undo: Array<() => void> = [];

  root.dataset.mode = mode;
  root.dataset.rail = vertical ? "v" : "h";
  undo.push(() => {
    root.dataset.mode = "static";
    delete root.dataset.rail;
  });

  const E = { out: "power3.out", io: "power2.inOut" };
  const items = all("railLink");
  const cap = one("cap");
  const rail = one("rail");
  let current = -1;

  const setActive = (i: number) => {
    if (i === current) return;
    const first = current === -1;
    current = i;
    items.forEach((a, k) => {
      if (k === i) a.setAttribute("aria-current", "step");
      else a.removeAttribute("aria-current");
    });
    cap.textContent = STEPS[i].body;
    if (!first) {
      gsap.fromTo(cap, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: E.out, overwrite: "auto" });
    }
    if (mode === "loop") {
      const a = items[i];
      rail.scrollTo({ left: Math.max(0, a.offsetLeft - 16), behavior: "smooth" });
    }
  };
  undo.push(() => {
    gsap.killTweensOf(cap);
    gsap.set(cap, { clearProps: "all" });
    cap.textContent = STEPS[0].body;
    items.forEach((a) => a.removeAttribute("aria-current"));
  });
  setActive(0);

  const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64;
  const looping = mode === "loop";

  const tl: gsap.core.Timeline = gsap.timeline(
    looping
      ? {
          paused: true,
          repeat: -1,
          repeatDelay: 1.2 * (BEATS / LOOP_SECONDS),
          defaults: { ease: E.io },
          onUpdate: () => setActive(Math.min(BEATS - 1, Math.floor(tl.time()))),
        }
      : {
          defaults: { ease: E.io },
          scrollTrigger: {
            trigger: one("stage"),
            start: () => `top top+=${headerH + 24}`,
            end: "+=380%",
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => setActive(Math.min(BEATS - 1, Math.floor(self.progress * BEATS))),
          },
        },
  );

  /* Text that is typed or counted by the timeline starts blank; restored on cleanup. */
  const typed: Array<[HTMLElement, string]> = [];
  const proxy = (
    el: HTMLElement,
    from: number,
    to: number,
    at: number,
    dur: number,
    ease: string,
    format: (n: number) => string,
  ) => {
    typed.push([el, el.textContent ?? ""]);
    el.textContent = format(from);
    const o = { n: from };
    const apply = () => {
      el.textContent = format(Math.round(o.n));
    };
    tl.fromTo(o, { n: from }, { n: to, duration: dur, ease, onUpdate: apply, onReverseComplete: apply }, at);
  };
  const typeInto = (el: HTMLElement, full: string, at: number, dur: number) =>
    proxy(el, 0, full.length, at, dur, "none", (n) => full.slice(0, n));
  undo.push(() => typed.forEach(([el, t]) => (el.textContent = t)));

  const fade = (el: Element | Element[], at: number, dur = 0.14) =>
    tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: dur, ease: "power2.out" }, at);

  /* Mobile: scale the fixed-size scene to the container width. */
  if (looping) {
    const scaler = one("scaler");
    const col = one("col");
    const fit = () => {
      const s = Math.min(1, scaler.clientWidth / SCENE_W);
      col.style.transform = `scale(${s})`;
      scaler.style.height = `${col.offsetHeight * s}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(scaler);
    undo.push(() => {
      ro.disconnect();
      col.style.transform = "";
      scaler.style.height = "";
    });
  }

  /* Rail progress (pin only): a violet fill and a 6px dot travel the line. */
  if (!looping) {
    const fill = one("trackFill");
    const dot = one("dot");
    const track = one("track");
    if (vertical) {
      tl.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: "none", duration: BEATS - 1 }, 0.5);
      tl.fromTo(dot, { y: 0 }, { y: () => track.offsetHeight, ease: "none", duration: BEATS - 1 }, 0.5);
    } else {
      tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, ease: "none", duration: BEATS }, 0);
      tl.fromTo(dot, { x: 0 }, { x: () => track.offsetWidth, ease: "none", duration: BEATS }, 0);
    }
  }

  /* Beat 1 · Paste (0 to 1) */
  fade(one("phMain"), 2.0, 0.12);
  typeInto(one("urlText"), URL_TEXT, 0.06, 0.52);
  tl.fromTo(one("caret"), { opacity: 1 }, { opacity: 0, duration: 0.1, ease: "none" }, 0.86);
  const parseBtn = one("parseBtn");
  tl.fromTo(parseBtn, { scale: 1 }, { scale: 0.97, duration: 0.07 }, 0.66);
  tl.to(parseBtn, { scale: 1, duration: 0.1, ease: E.out }, 0.73);
  const progress = one("progress");
  tl.fromTo(progress, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.3 }, 0.72);
  tl.to(progress, { opacity: 0, duration: 0.15, ease: "power2.out" }, 1.1);

  /* Beat 2 · Parse (1 to 2) */
  fade(one("phSide"), 1.0, 0.12);
  proxy(one("count"), 0, 20, 1.06, 0.9, "none", countLabel);
  const starts = [1.06, 1.44, 1.58];
  all("group").forEach((g, gi) => {
    const t = starts[gi];
    const head = g.querySelector<HTMLElement>('[data-wf="gHead"]') as HTMLElement;
    const chev = g.querySelector<HTMLElement>('[data-wf="chev"]') as HTMLElement;
    const rows = all("row", g);
    tl.fromTo(head, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.16, ease: E.out }, t);
    tl.fromTo(chev, { rotation: -45 }, { rotation: 45, duration: 0.22 }, t + 0.06);
    tl.fromTo(rows, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.16, ease: E.out, stagger: 0.04 }, t + 0.12);
  });

  /* Beat 3 · Run (2 to 3) */
  tl.fromTo(one("parseFill"), { opacity: 1 }, { opacity: 0, duration: 0.2 }, 2.0);
  tl.fromTo(one("parseA"), { opacity: 1 }, { opacity: 0, duration: 0.2 }, 2.0);
  tl.fromTo(one("parseB"), { opacity: 0 }, { opacity: 1, duration: 0.2 }, 2.0);
  tl.fromTo(one("sel"), { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "power2.out" }, 2.04);
  tl.fromTo(one("req"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.26, ease: E.out }, 2.14);
  typeInto(one("body"), REQ_BODY, 2.28, 0.3);
  const send = one("send");
  tl.fromTo(send, { scale: 1 }, { scale: 0.97, duration: 0.06 }, 2.62);
  tl.to(send, { scale: 1, duration: 0.08, ease: E.out }, 2.68);
  tl.fromTo(one("resp"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.24, ease: E.out }, 2.7);
  typeInto(one("respBody"), RESP_BODY, 2.8, 0.16);
  fade(one("phInsp"), 2.9, 0.1);

  /* Beat 4 · Validate (3 to 4) */
  tl.fromTo(one("checksHead"), { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power2.out" }, 3.0);
  all("check").forEach((row, k) => {
    const t = 3.08 + 0.2 * k;
    const tick = row.querySelector<HTMLElement>('[data-wf="tick"]') as HTMLElement;
    tl.fromTo(row, { opacity: 0, x: 8 }, { opacity: 1, x: 0, duration: 0.18, ease: E.out }, t);
    tl.fromTo(tick, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.16 }, t + 0.1);
  });
  tl.fromTo(
    one("banner"),
    { opacity: 0, clipPath: "inset(0 100% 0 0)" },
    { opacity: 1, clipPath: "inset(0 0% 0 0)", duration: 0.26 },
    3.74,
  );
  tl.fromTo(one("bannerTick"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.1 }, 3.88);

  /* Beat 5 · Score (4 to 5) */
  tl.fromTo(one("scoreHead"), { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "power2.out" }, 4.0);
  tl.fromTo(one("gauge"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: E.out }, 4.02);
  tl.fromTo(one("arc"), { strokeDashoffset: 100 }, { strokeDashoffset: 14, duration: 0.7 }, 4.1);
  proxy(one("num"), 0, 86, 4.1, 0.7, E.io, (n) => String(n));
  tl.fromTo(one("gMeta"), { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" }, 4.3);
  tl.fromTo(all("pillar"), { opacity: 0 }, { opacity: 1, duration: 0.14, ease: "power2.out", stagger: 0.05 }, 4.2);
  tl.fromTo(
    all("pFill"),
    { scaleX: 0 },
    { scaleX: (_i: number, t: Element) => parseFloat((t as HTMLElement).dataset.v ?? "1"), duration: 0.4, ease: E.out, stagger: 0.05 },
    4.25,
  );

  /* Beat 6 · Export (5 to 6) */
  const win = one("window");
  const files = one("files");
  all("chip").forEach((chip, i) => {
    const origin = () => {
      const cx = files.offsetLeft + chip.offsetLeft + chip.offsetWidth / 2;
      const cy = files.offsetTop + chip.offsetTop + chip.offsetHeight / 2;
      const sx = win.offsetLeft + win.offsetWidth * 0.5 + (i - 1) * 44;
      const sy = win.offsetTop + win.offsetHeight - 64;
      return { x: sx - cx, y: sy - cy };
    };
    tl.fromTo(
      chip,
      { opacity: 0, scale: 0.88, x: () => origin().x, y: () => origin().y },
      { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.55, ease: E.out },
      5.04 + 0.2 * i,
    );
  });
  tl.fromTo(one("closing"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.28, ease: E.out }, 5.7);
  tl.to({}, { duration: 0.01 }, BEATS - 0.01);

  /* Rail links jump the timeline to a beat. */
  items.forEach((a, i) => {
    const onClick = (e: Event) => {
      e.preventDefault();
      if (looping) {
        tl.seek(i + 0.02);
        tl.play();
        return;
      }
      const st = tl.scrollTrigger;
      if (st) st.scroll(st.start + (st.end - st.start) * ((i + 0.02) / BEATS));
    };
    a.addEventListener("click", onClick);
    undo.push(() => a.removeEventListener("click", onClick));
  });

  /* Loop mode only plays while the scene is on screen and the tab is visible. */
  if (looping) {
    const view = ScrollTrigger.create({
      trigger: root,
      start: "top 90%",
      end: "bottom 10%",
      onToggle: (self) => {
        if (self.isActive && !document.hidden) tl.play();
        else tl.pause();
      },
    });
    tl.timeScale(BEATS / LOOP_SECONDS);
    const onVis = () => {
      if (document.hidden) tl.pause();
      else if (view.isActive) tl.play();
    };
    document.addEventListener("visibilitychange", onVis);
    undo.push(() => document.removeEventListener("visibilitychange", onVis));
  }

  return () => undo.forEach((f) => f());
}

export default function Workflow() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let mm: { revert: () => void } | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const m = gsap.matchMedia();
      mm = m;
      m.add(
        {
          pinV: "(min-width: 1100px) and (prefers-reduced-motion: no-preference)",
          pinH: "(min-width: 900px) and (max-width: 1099px) and (prefers-reduced-motion: no-preference)",
          loop: "(max-width: 899px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const c = (ctx.conditions ?? {}) as { pinV?: boolean; pinH?: boolean; loop?: boolean };
          return setup(gsap, ScrollTrigger, root, c.loop ? "loop" : "pin", Boolean(c.pinV));
        },
      );
    })();

    return () => {
      cancelled = true;
      mm?.revert();
    };
  }, []);

  return (
    <section id="how-it-works" className={styles.section} aria-labelledby="workflow-heading">
      <div className={styles.inner}>
        <SectionHead
          id="workflow-heading"
          title="From URL to validated request"
          lede="No install, no account, no collection to import. The spec is the starting point and everything after it happens in the same tab."
        />

        <div className={styles.root} ref={rootRef} data-mode="static">
          <div className={styles.stage} data-wf="stage">
            <nav className={styles.rail} aria-label="Workflow steps" data-wf="rail">
              <ol className={styles.railList}>
                {STEPS.map((s) => (
                  <li key={s.id}>
                    <a href="#how-it-works" className={styles.railLink} data-wf="railLink">
                      {s.name}
                    </a>
                  </li>
                ))}
              </ol>
              <span className={styles.track} data-wf="track" aria-hidden="true">
                <span className={styles.trackFill} data-wf="trackFill" />
              </span>
              <span className={styles.dot} data-wf="dot" aria-hidden="true" />
            </nav>

            <div className={styles.caption}>
              <p className={styles.capText} data-wf="cap">
                {STEPS[0].body}
              </p>
            </div>

            <div className={styles.scaler} data-wf="scaler" aria-hidden="true">
              <div className={styles.col} data-wf="col">
                <div className={styles.window} data-wf="window">
                  <div className={styles.chrome}>
                    <span className={styles.path}>apiforge / swagger-petstore</span>
                    <span className={styles.tag}>Example</span>
                  </div>
                  <div className={styles.body}>
                    <div className={styles.sidebar}>
                      <p className={styles.count} data-wf="count">
                        20 endpoints · 3 tags
                      </p>
                      <p className={styles.ph} data-wf="phSide">
                        No spec loaded
                      </p>
                      {GROUPS.map((g) => (
                        <div key={g.tag} className={styles.group} data-wf="group">
                          <div className={styles.groupHead} data-wf="gHead">
                            <span className={styles.chev} data-wf="chev" />
                            <span className={styles.gName}>{g.tag}</span>
                            <span className={styles.gCount}>{g.count}</span>
                          </div>
                          <ul className={styles.gRows}>
                            {g.rows.map((r) => (
                              <li key={r.m + r.p} className={styles.row} data-wf="row">
                                {r.sel ? <span className={styles.rowSel} data-wf="sel" /> : null}
                                <span className={`${styles.chip} ${styles[`chip_${r.m}`]}`}>{r.m}</span>
                                <span className={styles.rowPath}>{r.p}</span>
                              </li>
                            ))}
                            <li className={`${styles.row} ${styles.more}`} data-wf="row">
                              +{g.more} more
                            </li>
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className={styles.main}>
                      <div className={styles.specBar}>
                        <span className={styles.specInput}>
                          <span data-wf="urlText">{URL_TEXT}</span>
                          <span className={styles.caretWrap} data-wf="caret">
                            <span className={styles.caret} />
                          </span>
                        </span>
                        <span className={`${styles.btn} ${styles.parseBtn}`} data-wf="parseBtn">
                          <span className={styles.btnFill} data-wf="parseFill" />
                          <span className={styles.btnA} data-wf="parseA">
                            Parse spec
                          </span>
                          <span className={styles.btnB} data-wf="parseB">
                            Parse spec
                          </span>
                        </span>
                        <span className={styles.progress} data-wf="progress" />
                      </div>
                      <p className={styles.ph} data-wf="phMain">
                        Paste a spec URL to begin
                      </p>
                      <div className={styles.req} data-wf="req">
                        <div className={styles.reqBar}>
                          <span className={`${styles.chip} ${styles.chip_post}`}>post</span>
                          <span className={styles.reqUrl}>petstore.swagger.io/v2/pet</span>
                          <span className={`${styles.btn} ${styles.sendBtn}`} data-wf="send">
                            Send
                          </span>
                        </div>
                        <pre className={styles.code} style={{ "--lines": 5 } as CSSProperties} data-wf="body">
                          {REQ_BODY}
                        </pre>
                      </div>
                      <div className={styles.resp} data-wf="resp">
                        <div className={styles.respHead}>
                          <span className={styles.label}>Response</span>
                          <span className={styles.status}>
                            <span className={styles.ok}>200 OK</span> · 142 ms
                          </span>
                        </div>
                        <pre className={styles.code} style={{ "--lines": 4 } as CSSProperties} data-wf="respBody">
                          {RESP_BODY}
                        </pre>
                      </div>
                    </div>

                    <div className={styles.insp}>
                      <p className={styles.ph} data-wf="phInsp">
                        Waiting for a response
                      </p>
                      <div className={styles.inspSec}>
                        <p className={styles.label} data-wf="checksHead">
                          Schema checks
                        </p>
                        <ul className={styles.checks}>
                          {CHECKS.map((c) => (
                            <li key={c.name} className={styles.check} data-wf="check">
                              <span className={styles.ckName}>{c.name}</span>
                              <span className={styles.ckType}>· {c.type}</span>
                              <span className={styles.tick} data-wf="tick" />
                            </li>
                          ))}
                        </ul>
                        <div className={styles.banner} data-wf="banner">
                          <span className={styles.tick} data-wf="bannerTick" />
                          <span>schema matches</span>
                        </div>
                      </div>
                      <div className={styles.inspSec}>
                        <p className={styles.label} data-wf="scoreHead">
                          API design score
                        </p>
                        <div className={styles.scoreTop}>
                          <div className={styles.gauge} data-wf="gauge">
                            <svg className={styles.gSvg} viewBox="0 0 72 72" aria-hidden="true">
                              <path className={styles.gTrack} d="M14.79 57.21 A30 30 0 1 1 57.21 57.21" pathLength={100} />
                              <path className={styles.gArc} d="M14.79 57.21 A30 30 0 1 1 57.21 57.21" pathLength={100} data-wf="arc" />
                            </svg>
                            <span className={styles.gNum} data-wf="num">
                              86
                            </span>
                          </div>
                          <p className={styles.gMeta} data-wf="gMeta">
                            out of 100
                            <br />
                            12 rules · 7 pillars
                          </p>
                        </div>
                        <ul className={styles.pillars}>
                          {PILLARS.map((p) => (
                            <li key={p.name} className={styles.pillar} data-wf="pillar">
                              <span className={styles.pName}>{p.name}</span>
                              <span className={styles.pBar}>
                                <span
                                  className={styles.pFill}
                                  data-wf="pFill"
                                  data-v={p.v}
                                  style={{ "--v": p.v } as CSSProperties}
                                />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.files} data-wf="files">
                  <div className={styles.fileChips}>
                    {FILES.map((f) => (
                      <span key={f} className={styles.fileChip} data-wf="chip">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className={styles.closing} data-wf="closing">
                    Same tab. No setup.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ol className={styles.steps}>
            {STEPS.map((s) => (
              <li key={s.id} className={styles.step}>
                <span className={styles.stepName}>{s.name}</span>
                <span className={styles.stepBody}>{s.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
