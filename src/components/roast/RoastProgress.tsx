"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./RoastProgress.module.css";

const STAGES: { label: string; icon: string; lines: string[] }[] = [
  {
    label: "Fetch spec",
    icon: "cloud_download",
    lines: [
      "Knocking on your spec's front door",
      "Waiting to see if the host answers",
      "Downloading every last line of YAML",
    ],
  },
  {
    label: "Parse",
    icon: "account_tree",
    lines: [
      "Counting verbs hiding in your URLs",
      "Following every $ref you left dangling",
      "Listing each endpoint, no skipping",
    ],
  },
  {
    label: "Score rules",
    icon: "rule",
    lines: [
      "Looking for the 2xx you forgot",
      "Checking whether that GET deletes things",
      "Measuring the documentation gaps",
    ],
  },
  {
    label: "Write the roast",
    icon: "edit_note",
    lines: [
      "Rehearsing the punchline",
      "Quoting your own route names back to you",
      "Deciding how rude is too rude",
    ],
  },
  {
    label: "Pick the meme",
    icon: "movie",
    lines: [
      "Matching your score to a reaction clip",
      "Searching for the right facial expression",
      "Cueing up the clip",
    ],
  },
];

const STAGE_MS = 650;
const TICK_MS = 1900;
const HOLD = 0.9;
const EXIT_MS = 450;
const PARTICLES = 8;

export interface RoastProgressProps {
  /** What is being roasted: a host name or file name. */
  target?: string;
  /** True once the report has arrived; the last stage waits for it. */
  done: boolean;
  onComplete: () => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function RoastProgress({ target, done, onComplete }: RoastProgressProps) {
  const [stage, setStage] = useState(0);
  const [tick, setTick] = useState(0);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const arcRef = useRef<SVGCircleElement | null>(null);
  const numRef = useRef<HTMLSpanElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<HTMLOListElement | null>(null);
  const packetRef = useRef<HTMLSpanElement | null>(null);
  const iconRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tickerRef = useRef<HTMLParagraphElement | null>(null);
  const particleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const gaugeVal = useRef({ v: 0 });
  const packetPlaced = useRef(false);

  const lastIndex = STAGES.length - 1;

  // Advance through the stages on a timer, holding on the last one until the report is in.
  useEffect(() => {
    if (stage >= lastIndex) return;
    const id = window.setTimeout(() => setStage((s) => s + 1), STAGE_MS);
    return () => window.clearTimeout(id);
  }, [stage, lastIndex]);

  const finished = done && stage >= lastIndex;
  const holding = !finished && stage >= lastIndex;

  useEffect(() => {
    if (!finished) return;
    const id = window.setTimeout(() => onCompleteRef.current(), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [finished]);

  const doneCount = finished ? STAGES.length : stage;
  const progress = finished ? 1 : Math.min(HOLD, (stage + 0.5) / STAGES.length);
  const percent = Math.round(progress * 100);

  const lines = STAGES[stage]!.lines;
  const line = lines[tick % lines.length]!;

  // Restart the rotating line whenever the stage changes.
  useEffect(() => {
    setTick(0);
  }, [stage]);

  // Ticker: slide the old line out, swap, slide the new one in.
  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => {
      const el = tickerRef.current;
      if (!el || prefersReducedMotion()) {
        setTick((t) => t + 1);
        return;
      }
      gsap.to(el, { y: -8, autoAlpha: 0, duration: 0.18, ease: "power2.in", onComplete: () => setTick((t) => t + 1) });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [finished]);

  useLayoutEffect(() => {
    const el = tickerRef.current;
    if (!el || prefersReducedMotion()) return;
    gsap.fromTo(el, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.32, ease: "power3.out", overwrite: true });
  }, [line]);

  // Gauge fill.
  useEffect(() => {
    const arc = arcRef.current;
    const num = numRef.current;
    if (!arc || !num) return;
    const write = () => {
      arc.style.strokeDashoffset = String(100 - gaugeVal.current.v * 100);
      num.textContent = String(Math.round(gaugeVal.current.v * 100));
    };
    if (prefersReducedMotion()) {
      gaugeVal.current.v = progress;
      write();
      return;
    }
    const tween = gsap.to(gaugeVal.current, {
      v: progress,
      duration: finished ? 0.5 : 0.7,
      ease: "power2.out",
      onUpdate: write,
    });
    return () => {
      tween.kill();
    };
  }, [progress, finished]);

  // Glow: gentle pulse while holding for the report, one flare on completion.
  useEffect(() => {
    const glow = glowRef.current;
    if (!glow || prefersReducedMotion()) return;
    const tweens: gsap.core.Tween[] = [];
    if (finished) {
      tweens.push(gsap.fromTo(glow, { scale: 1, opacity: 1 }, { scale: 1.2, opacity: 0.9, duration: 0.35, yoyo: true, repeat: 1, ease: "power2.out" }));
    } else if (holding) {
      tweens.push(gsap.to(glow, { opacity: 1, scale: 1.06, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
    } else {
      tweens.push(gsap.to(glow, { opacity: 0.55, scale: 1, duration: 0.4 }));
    }
    return () => {
      tweens.forEach((t) => t.kill());
    };
  }, [holding, finished]);

  // Packet travels to the active stage icon (the last one once finished).
  useLayoutEffect(() => {
    const packet = packetRef.current;
    const flow = flowRef.current;
    if (!packet || !flow) return;
    const index = finished ? lastIndex : stage;
    const place = () => {
      const icon = iconRefs.current[index];
      if (!icon) return null;
      const f = flow.getBoundingClientRect();
      const i = icon.getBoundingClientRect();
      return { x: i.left - f.left + i.width / 2, y: i.top - f.top + i.height / 2 };
    };
    const to = place();
    if (!to) return;
    if (prefersReducedMotion() || !packetPlaced.current) {
      gsap.set(packet, { x: to.x, y: to.y, autoAlpha: 1 });
    } else {
      gsap.to(packet, { x: to.x, y: to.y, duration: 0.5, ease: "power2.inOut", overwrite: "auto" });
    }
    packetPlaced.current = true;
    const onResize = () => {
      const p = place();
      if (p) gsap.set(packet, { x: p.x, y: p.y });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [stage, finished, lastIndex]);

  // Rising embers.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      particleRefs.current.forEach((el, i) => {
        if (!el) return;
        const spread = (i / (PARTICLES - 1) - 0.5) * 150;
        gsap.set(el, { x: spread, y: 0, opacity: 0, rotation: gsap.utils.random(-30, 30) });
        gsap
          .timeline({ repeat: -1, delay: gsap.utils.random(0, 2.2), repeatDelay: gsap.utils.random(0, 0.8) })
          .to(el, { opacity: 0.85, duration: 0.3 })
          .to(
            el,
            {
              y: -gsap.utils.random(90, 150),
              x: spread + gsap.utils.random(-22, 22),
              rotation: "+=120",
              duration: gsap.utils.random(1.8, 2.8),
              ease: "power1.out",
            },
            0,
          )
          .to(el, { opacity: 0, duration: 0.9, ease: "power1.in" }, ">-0.9");
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className={styles.card} data-finished={finished || undefined}>
      <div className={styles.gaugeWrap}>
        <div className={styles.embers} aria-hidden>
          {Array.from({ length: PARTICLES }, (_, i) => (
            <span
              key={i}
              className={styles.ember}
              ref={(el) => {
                particleRefs.current[i] = el;
              }}
            />
          ))}
        </div>
        <div
          className={styles.gauge}
          role="progressbar"
          aria-label="Roast progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div ref={glowRef} className={styles.glow} aria-hidden />
          <svg className={styles.svg} viewBox="0 0 200 200" aria-hidden focusable="false">
            <defs>
              <linearGradient id="roast-gauge-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" className={styles.stopA} />
                <stop offset="45%" className={styles.stopB} />
                <stop offset="100%" className={styles.stopC} />
              </linearGradient>
            </defs>
            <circle className={styles.trackRing} cx="100" cy="100" r="84" fill="none" pathLength={100} />
            <circle
              ref={arcRef}
              className={styles.arc}
              cx="100"
              cy="100"
              r="84"
              fill="none"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset="100"
              stroke="url(#roast-gauge-grad)"
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className={styles.readout} aria-hidden>
            <span className={styles.percent}>
              <span ref={numRef}>0</span>
              <span className={styles.percentSign}>%</span>
            </span>
            <span className={styles.heatLabel}>{finished ? "Verdict ready" : "Heat"}</span>
          </div>
        </div>
      </div>

      {target ? <p className={styles.target}>{target}</p> : null}

      <ol ref={flowRef} className={styles.flow} aria-label="Roast stages">
        <span ref={packetRef} className={styles.packet} aria-hidden />
        {STAGES.map(({ label, icon }, i) => {
          const state = i < doneCount ? "done" : i === stage ? "active" : "idle";
          return (
            <li key={label} className={styles.chip} data-state={state}>
              {i < STAGES.length - 1 ? (
                <span className={styles.link} aria-hidden>
                  <span className={styles.linkFill} data-on={i < doneCount ? "true" : undefined} />
                </span>
              ) : null}
              <span
                className={styles.chipIcon}
                ref={(el) => {
                  iconRefs.current[i] = el;
                }}
              >
                <span className={styles.ring} aria-hidden />
                <MaterialIcon name={state === "done" ? "check" : icon} size="sm" className={styles.glyph} />
              </span>
              <span className={styles.chipLabel}>
                {label}
                <span className={styles.srOnly}>
                  {state === "done" ? ", done" : state === "active" ? ", in progress" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <p ref={tickerRef} className={styles.ticker} aria-hidden>
        {finished ? "Serving it up" : line}
      </p>

      <p className={styles.srOnly} aria-live="polite">
        {finished ? "Verdict ready." : `${STAGES[stage]!.label}.`}
      </p>
    </div>
  );
}
