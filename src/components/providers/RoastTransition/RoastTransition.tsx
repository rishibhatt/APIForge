"use client";

import Image, { getImageProps } from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ROAST_LOGO_PATH } from "@/constants/assets";
import styles from "./RoastTransition.module.css";

type Gsap = typeof import("gsap").gsap;

const ROAST_PATH = "/roast-my-api";
const MIN_MS = 3000;
const FAILSAFE_MS = 6000;
const WIPE_IN_S = 0.55;
const WIPE_OUT_S = 0.5;
const FADE_S = 0.25;
const SUBLINE_MS = 750;
const EMBER_COUNT = 20;
const SUBLINES = [
  "Sharpening the jokes",
  "Finding your worst endpoint",
  "Warming up the meme",
  "Counting your missing error responses",
];

type Overlay = { x: number; y: number; reduced: boolean };

let gsapPromise: Promise<Gsap> | null = null;
function loadGsap(): Promise<Gsap> {
  if (!gsapPromise) {
    gsapPromise = import("gsap").then((m) => m.gsap);
    gsapPromise.catch(() => {
      gsapPromise = null;
    });
  }
  return gsapPromise;
}

let logoWarm = false;
/** Fetch the optimized fire logo ahead of the click so it never pops in as an empty silhouette. */
function warmLogo() {
  if (logoWarm || typeof window === "undefined") return;
  logoWarm = true;
  const { props } = getImageProps({ src: ROAST_LOGO_PATH, alt: "", width: 120, height: 120, priority: true });
  const img = new window.Image();
  if (props.srcSet) img.srcset = props.srcSet;
  img.src = String(props.src);
}

function normalizePath(p: string): string {
  return p.replace(/\/+$/, "") || "/";
}

function coverRadius(x: number, y: number): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y))) + 4;
}

export function RoastTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [overlay, setOverlay] = useState<Overlay | null>(null);

  const routerRef = useRef(router);
  const pathnameRef = useRef(pathname);
  const activeRef = useRef(false);
  const minDoneRef = useRef(false);
  const exitingRef = useRef(false);
  const gsapRef = useRef<Gsap | null>(null);
  const ctxRef = useRef<ReturnType<Gsap["context"]> | null>(null);
  const minTimerRef = useRef<number | null>(null);
  const failTimerRef = useRef<number | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const lockRef = useRef<{ overflow: string; paddingRight: string } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const logoWrapRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const embersRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLDivElement>(null);

  routerRef.current = router;
  overlayRef.current = overlay;

  const lockScroll = useCallback(() => {
    if (lockRef.current) return;
    const body = document.body;
    lockRef.current = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (sbw > 0) body.style.paddingRight = `${sbw}px`;
    body.setAttribute("aria-busy", "true");
  }, []);

  const unlockScroll = useCallback(() => {
    const body = document.body;
    if (lockRef.current) {
      body.style.overflow = lockRef.current.overflow;
      body.style.paddingRight = lockRef.current.paddingRight;
      lockRef.current = null;
    }
    body.removeAttribute("aria-busy");
  }, []);

  const clearTimers = useCallback(() => {
    if (minTimerRef.current !== null) window.clearTimeout(minTimerRef.current);
    if (failTimerRef.current !== null) window.clearTimeout(failTimerRef.current);
    minTimerRef.current = null;
    failTimerRef.current = null;
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    ctxRef.current?.revert();
    ctxRef.current = null;
    activeRef.current = false;
    exitingRef.current = false;
    minDoneRef.current = false;
    unlockScroll();
    setOverlay(null);
  }, [clearTimers, unlockScroll]);

  const tryExit = useCallback(() => {
    if (!activeRef.current || exitingRef.current) return;
    if (!minDoneRef.current || normalizePath(pathnameRef.current ?? "") !== ROAST_PATH) return;
    const gsap = gsapRef.current;
    const root = rootRef.current;
    const ov = overlayRef.current;
    const ctx = ctxRef.current;
    if (!gsap || !root || !ov || !ctx) return;
    exitingRef.current = true;
    if (failTimerRef.current !== null) window.clearTimeout(failTimerRef.current);
    failTimerRef.current = null;
    ctx.add(() => {
      if (ov.reduced) {
        gsap.to(root, { opacity: 0, duration: FADE_S, ease: "none", onComplete: finish });
      } else {
        gsap.to(root, {
          clipPath: `circle(0px at ${window.innerWidth / 2}px ${window.innerHeight / 2}px)`,
          duration: WIPE_OUT_S,
          ease: "power3.inOut",
          onComplete: finish,
        });
      }
    });
  }, [finish]);

  // Pathname changes drive the "page mounted" half of the exit condition.
  useEffect(() => {
    pathnameRef.current = pathname;
    tryExit();
  }, [pathname, tryExit]);

  // Capture-phase delegation: preload gsap on intent, start the transition on click.
  useEffect(() => {
    const findAnchor = (t: EventTarget | null): HTMLAnchorElement | null =>
      t instanceof Element ? t.closest<HTMLAnchorElement>("a[href]") : null;

    const toRoast = (a: HTMLAnchorElement): URL | null => {
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return null;
      }
      if (url.origin !== window.location.origin) return null;
      return normalizePath(url.pathname) === ROAST_PATH ? url : null;
    };

    const onIntent = (e: Event) => {
      const a = findAnchor(e.target);
      if (a && toRoast(a)) {
        void loadGsap().catch(() => undefined);
        warmLogo();
      }
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = findAnchor(e.target);
      if (!a) return;
      const target = a.getAttribute("target");
      if (target && target !== "_self") return;
      if (a.hasAttribute("download")) return;
      const url = toRoast(a);
      if (!url) return;
      if (normalizePath(window.location.pathname) === ROAST_PATH) return;

      e.preventDefault();
      if (activeRef.current) return;

      const href = `${url.pathname}${url.search}${url.hash}`;
      let x = e.clientX;
      let y = e.clientY;
      if (e.detail === 0 || (x === 0 && y === 0)) {
        const r = a.getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      activeRef.current = true;
      exitingRef.current = false;
      minDoneRef.current = false;
      lockScroll();
      setOverlay({ x, y, reduced });
      void loadGsap().catch(() => undefined);
      warmLogo();

      routerRef.current.prefetch(href);
      routerRef.current.push(href);

      minTimerRef.current = window.setTimeout(() => {
        minDoneRef.current = true;
        tryExit();
      }, MIN_MS);
      failTimerRef.current = window.setTimeout(finish, FAILSAFE_MS);
    };

    document.addEventListener("pointerenter", onIntent, true);
    document.addEventListener("focusin", onIntent, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerenter", onIntent, true);
      document.removeEventListener("focusin", onIntent, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [finish, lockScroll, tryExit]);

  // Build the animation once the overlay is mounted.
  useEffect(() => {
    if (!overlay) return;
    let killed = false;
    let subInterval: number | null = null;

    const embersEl = embersRef.current;

    loadGsap()
      .then((gsap) => {
        if (killed || !rootRef.current) return;
        gsapRef.current = gsap;
        const root = rootRef.current;
        const ctx = gsap.context(() => {
          const subs = subRef.current ? Array.from(subRef.current.children) : [];
          const dots = dotsRef.current ? Array.from(dotsRef.current.children) : [];

          if (overlay.reduced) {
            gsap.set(subs[0], { opacity: 1 });
            gsap.set(dots, { opacity: 1 });
            gsap.to(root, { opacity: 1, duration: FADE_S, ease: "none" });
            return;
          }

          gsap.to(root, {
            clipPath: `circle(${coverRadius(overlay.x, overlay.y)}px at ${overlay.x}px ${overlay.y}px)`,
            duration: WIPE_IN_S,
            ease: "power3.inOut",
          });

          gsap.fromTo(
            logoWrapRef.current,
            { scale: 0.6, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, delay: 0.25, ease: "power3.out" },
          );
          gsap.to(logoRef.current, {
            scale: 1.04,
            filter: "brightness(1.18)",
            duration: 1,
            delay: 0.85,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });

          gsap.to(dots, {
            opacity: 1,
            duration: 0.3,
            stagger: { each: 0.25, repeat: -1, repeatDelay: 0.45, yoyo: true },
            ease: "none",
          });

          gsap.fromTo(fillRef.current, { scaleX: 0 }, { scaleX: 1, duration: MIN_MS / 1000, ease: "none" });

          let idx = 0;
          gsap.fromTo(subs[0], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, delay: 0.3 });
          subInterval = window.setInterval(() => {
            const prev = subs[idx];
            idx = (idx + 1) % subs.length;
            gsap.to(prev, { opacity: 0, y: -8, duration: 0.2, ease: "power2.in" });
            gsap.fromTo(subs[idx], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, delay: 0.1, ease: "power2.out" });
          }, SUBLINE_MS);

          const box = embersEl;
          if (box) {
            const h = window.innerHeight;
            for (let i = 0; i < EMBER_COUNT; i += 1) {
              const el = document.createElement("div");
              const size = 3 + Math.round(Math.random() * 3);
              el.className = styles.ember;
              el.style.width = `${size}px`;
              el.style.height = `${size}px`;
              el.style.left = `${Math.random() * 100}%`;
              if (Math.random() > 0.5) el.style.background = "var(--ov-amber)";
              box.appendChild(el);
              gsap.fromTo(
                el,
                { y: 0, x: 0, opacity: 0.9, rotation: Math.random() > 0.5 ? 45 : 0 },
                {
                  y: -(h * (0.45 + Math.random() * 0.5)),
                  x: (Math.random() - 0.5) * 120,
                  opacity: 0,
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 2,
                  ease: "power1.out",
                  repeat: -1,
                },
              );
            }
          }
        }, root);
        ctxRef.current = ctx;
        tryExit();
      })
      .catch(() => {
        if (!killed) finish();
      });

    return () => {
      killed = true;
      if (subInterval !== null) window.clearInterval(subInterval);
      embersEl?.replaceChildren();
    };
  }, [overlay, tryExit, finish]);

  // Unmount safety: never leave scroll locked or timers running.
  useEffect(
    () => () => {
      clearTimers();
      ctxRef.current?.revert();
      ctxRef.current = null;
      activeRef.current = false;
      unlockScroll();
    },
    [clearTimers, unlockScroll],
  );

  if (!overlay) return null;

  const initialStyle = overlay.reduced
    ? { opacity: 0 }
    : { clipPath: `circle(0px at ${overlay.x}px ${overlay.y}px)` };

  return (
    <div ref={rootRef} className={styles.overlay} style={initialStyle} role="status" aria-live="polite">
      <span className={styles.srOnly}>Loading the roast page</span>
      <div aria-hidden="true" className={styles.embers} ref={embersRef} />
      <div aria-hidden="true" className={styles.stack}>
        <div ref={logoWrapRef} className={styles.logoWrap} style={{ opacity: overlay.reduced ? 1 : 0 }}>
          <div ref={logoRef}>
            <Image src={ROAST_LOGO_PATH} alt="" width={120} height={120} priority className={styles.logo} />
          </div>
        </div>
        <p className={styles.headline}>
          Heating up the roast
          <span ref={dotsRef}>
            <span className={styles.dot} style={{ opacity: 0 }}>.</span>
            <span className={styles.dot} style={{ opacity: 0 }}>.</span>
            <span className={styles.dot} style={{ opacity: 0 }}>.</span>
          </span>
        </p>
        <div ref={subRef} className={styles.subline}>
          {SUBLINES.map((s) => (
            <span key={s} className={styles.subItem}>
              {s}
            </span>
          ))}
        </div>
        {!overlay.reduced && (
          <div className={styles.track}>
            <div ref={fillRef} className={styles.fill} />
          </div>
        )}
      </div>
      <p aria-hidden="true" className={`${styles.corner} ${styles.cornerLeft}`}>
        APIForge / Roast My API
      </p>
      <p aria-hidden="true" className={`${styles.corner} ${styles.cornerRight}`}>
        No mercy, rule-based score
      </p>
    </div>
  );
}
