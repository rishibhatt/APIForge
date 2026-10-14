"use client";

import { useEffect, useRef } from "react";
import SectionHead from "../SectionHead";
import StickyShowcase, { type ShowcaseItem } from "../StickyShowcase";
import styles from "./FourTools.module.css";

const ITEMS: ShowcaseItem[] = [
  {
    id: "docs",
    title: "Read the docs",
    body: "Every operation grouped by tag, with parameters and response schemas next to it.",
  },
  {
    id: "run",
    title: "Send the request",
    body: "Run it from the browser, or through the proxy when CORS blocks it. Bearer, Basic, and API-key auth are built in.",
  },
  {
    id: "score",
    title: "Grade the design",
    body: "Seven rule-based pillars give a 0–100 score. Every issue names the route.",
  },
  {
    id: "types",
    title: "Write the types",
    body: "TypeScript for one endpoint or the whole API, plus tests you can run on the spot.",
  },
];

const CAPTIONS = ["Replaces: Swagger UI", "Replaces: Postman", "Replaces: a linter", "Replaces: a type generator"];

const SIDEBAR: { method: string; path: string; tone: string }[] = [
  { method: "POST", path: "/pet", tone: "post" },
  { method: "GET", path: "/pet/{id}", tone: "get" },
  { method: "PUT", path: "/pet", tone: "put" },
  { method: "DEL", path: "/pet/{id}", tone: "delete" },
];

const FLAGS = [
  { route: "GET /pet/findByStatus", issue: "verb in path" },
  { route: "DELETE /pet/{petId}", issue: "no 404 response" },
  { route: "PUT /pet", issue: "missing description" },
];

function Chip({ tone, children }: { tone: string; children: string }) {
  return <span className={`${styles.chip} ${styles[`chip_${tone}`]}`}>{children}</span>;
}

/** The main-area content for one of the four states. Example data only. */
function StateView({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className={styles.state}>
        <div className={styles.opHead}>
          <Chip tone="post">POST</Chip>
          <span className={styles.opPath}>/pet</span>
        </div>
        <p className={styles.opSummary}>Add a new pet to the store</p>
        <div className={styles.label}>Parameters</div>
        <ul className={styles.rows}>
          <li className={styles.row}>
            <span className={styles.mono}>name</span>
            <span className={styles.dim}>string</span>
            <span className={styles.req}>required</span>
          </li>
          <li className={styles.row}>
            <span className={styles.mono}>status</span>
            <span className={styles.dim}>string</span>
            <span className={styles.dim}>optional</span>
          </li>
        </ul>
        <div className={styles.label}>Responses</div>
        <ul className={styles.rows}>
          <li className={styles.row}>
            <Chip tone="get">200</Chip>
            <span className={styles.mono}>Pet</span>
            <span className={styles.dim}>application/json</span>
          </li>
        </ul>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className={styles.state}>
        <div className={styles.urlBar}>
          <Chip tone="post">POST</Chip>
          <span className={`${styles.mono} ${styles.url}`}>https://petstore.example/v2/pet</span>
          <span className={styles.send}>Send</span>
        </div>
        <div className={styles.respHead}>
          <span className={styles.label}>Response</span>
          <span className={styles.status}>
            <span className={styles.ok}>200 OK</span>
            <span className={styles.dim}> · 142 ms</span>
          </span>
        </div>
        <pre className={styles.code}>
          <code>
            {"{\n  "}
            <span className={styles.tProp}>&quot;id&quot;</span>
            {": "}
            <span className={styles.tNum}>101</span>
            {",\n  "}
            <span className={styles.tProp}>&quot;name&quot;</span>
            {": "}
            <span className={styles.tStr}>&quot;Biscuit&quot;</span>
            {",\n  "}
            <span className={styles.tProp}>&quot;status&quot;</span>
            {": "}
            <span className={styles.tStr}>&quot;available&quot;</span>
            {"\n}"}
          </code>
        </pre>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className={styles.state}>
        <div className={styles.scoreRow}>
          <span className={styles.scoreNum}>
            86<span className={styles.scoreOf}>/100</span>
          </span>
          <span className={styles.label}>Design score</span>
        </div>
        <div className={styles.bar} aria-hidden>
          <span className={styles.barFill} />
        </div>
        <div className={styles.label}>Flagged</div>
        <ul className={styles.rows}>
          {FLAGS.map((f) => (
            <li key={f.route} className={`${styles.row} ${styles.flag}`}>
              <span className={styles.mono}>{f.route}</span>
              <span className={styles.dim}>{f.issue}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className={styles.state}>
      <div className={styles.respHead}>
        <span className={styles.label}>pet.ts</span>
        <span className={styles.dim}>TypeScript</span>
      </div>
      <pre className={styles.code}>
        <code>
          <span className={styles.tKw}>export interface</span> <span className={styles.tType}>Pet</span>
          {" {\n  "}
          <span className={styles.tProp}>id</span>
          {": "}
          <span className={styles.tType}>number</span>
          {";\n  "}
          <span className={styles.tProp}>name</span>
          {": "}
          <span className={styles.tType}>string</span>
          {";\n  "}
          <span className={styles.tProp}>status</span>
          {"?: "}
          <span className={styles.tStr}>&quot;available&quot;</span>
          {" | "}
          <span className={styles.tStr}>&quot;sold&quot;</span>
          {";\n  "}
          <span className={styles.tProp}>tags</span>
          {"?: "}
          <span className={styles.tType}>Tag</span>
          {"[];\n}"}
        </code>
      </pre>
    </div>
  );
}

function Sidebar() {
  return (
    <ul className={styles.side} aria-hidden>
      {SIDEBAR.map((s, i) => (
        <li key={s.method + s.path + i} className={`${styles.sideRow} ${i === 0 ? styles.sideOn : ""}`}>
          <Chip tone={s.tone}>{s.method}</Chip>
          <span className={styles.sidePath}>{s.path}</span>
        </li>
      ))}
    </ul>
  );
}

function Chrome() {
  return (
    <div className={styles.chrome}>
      <span className={styles.crumb}>apiforge / swagger-petstore</span>
      <span className={styles.example}>Example</span>
    </div>
  );
}

function Panel({ active }: { active: number }) {
  const stackRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    const from = prev.current;
    prev.current = active;
    if (from === null || from === active) return;
    const stack = stackRef.current;
    const caps = capRef.current;
    if (!stack || !caps) return;
    let cancelled = false;
    let ctx: { kill: () => void } | null = null;

    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;
      ctx = gsap.context(() => {
        const layers = Array.from(stack.children) as HTMLElement[];
        const lines = Array.from(caps.children) as HTMLElement[];
        const swap = (els: HTMLElement[], yIn: number) => {
          els.forEach((el, i) => {
            if (i !== from && i !== active) {
              gsap.killTweensOf(el);
              gsap.set(el, { autoAlpha: 0 });
            }
          });
          const out = els[from];
          const inn = els[active];
          gsap.killTweensOf([out, inn]);
          const tl = gsap.timeline();
          tl.to(out, { autoAlpha: 0, y: -8, duration: 0.18, ease: "power3.out" }, 0);
          tl.fromTo(inn, { autoAlpha: 0, y: yIn }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power3.out" }, 0.14);
        };
        swap(layers, 12);
        swap(lines, 6);
      });
    })();

    return () => {
      cancelled = true;
      ctx?.kill();
    };
  }, [active]);

  return (
    <div className={styles.panelWrap}>
      <div className={styles.window}>
        <Chrome />
        <div className={styles.body}>
          <Sidebar />
          <div ref={stackRef} className={styles.mainStack}>
            {ITEMS.map((it, i) => (
              <div
                key={it.id}
                className={styles.layer}
                style={i === 0 ? undefined : { opacity: 0, visibility: "hidden" }}
              >
                <StateView index={i} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div ref={capRef} className={styles.capStack}>
        {CAPTIONS.map((c, i) => (
          <p key={c} className={styles.caption} style={i === 0 ? undefined : { opacity: 0, visibility: "hidden" }}>
            {c}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function FourTools() {
  return (
    <section id="features" className={styles.section} aria-labelledby="four-tools-heading">
      <div className={styles.inner}>
        <SectionHead
          id="four-tools-heading"
          title="One tab instead of four tools"
          lede="Swagger UI shows the docs, Postman sends the request, a linter grades the design, and a generator writes the types. APIForge does all four against the same spec."
        />
        <StickyShowcase
          items={ITEMS}
          label="What APIForge does in one tab"
          renderVisual={(active) => <Panel active={active} />}
          renderInline={(i) => (
            <div className={styles.inlineWrap}>
              <div className={styles.window}>
                <Chrome />
                <div className={styles.body}>
                  <Sidebar />
                  <div className={styles.mainStatic}>
                    <StateView index={i} />
                  </div>
                </div>
              </div>
              <p className={styles.caption}>{CAPTIONS[i]}</p>
            </div>
          )}
        />
      </div>
    </section>
  );
}
