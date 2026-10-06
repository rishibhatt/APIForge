"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./RoastSubNav.module.css";

export interface RoastSubNavItem {
  id: string;
  label: string;
}

export interface RoastSubNavProps {
  items: RoastSubNavItem[];
}

type Gsap = typeof import("gsap").gsap;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Sticky "The receipts" bar with a scrollspy. The active tab gets text colour plus one 2px
 * underline that slides between tabs (GSAP x/width on a single element). Clicking scrolls to the
 * section; narrow screens keep the active tab centred inside the scrolling row.
 */
export default function RoastSubNav({ items }: RoastSubNavProps) {
  const [active, setActive] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const gsapRef = useRef<Gsap | null>(null);
  const lockRef = useRef<{ id: string; until: number } | null>(null);
  const placedRef = useRef(false);

  const ids = items.map((i) => i.id).join("|");

  // —— Scrollspy: the active section is the last one whose top has passed the sticky offset ——
  useEffect(() => {
    const sectionIds = ids.split("|").filter(Boolean);
    let raf = 0;

    const compute = () => {
      raf = 0;
      const nav = rowRef.current?.parentElement;
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64;
      const line = header + (nav?.offsetHeight ?? 48) + 24;
      let current: string | null = null;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        const lastExisting = [...sectionIds].reverse().find((id) => document.getElementById(id));
        if (lastExisting) current = lastExisting;
      }

      const lock = lockRef.current;
      if (lock) {
        if (current === lock.id || Date.now() > lock.until) lockRef.current = null;
        else return;
      }
      setActive((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ids]);

  // —— GSAP loads on demand; until then the indicator is placed with plain styles ——
  useEffect(() => {
    let cancelled = false;
    import("gsap").then(({ gsap }) => {
      if (!cancelled) gsapRef.current = gsap;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const placeIndicator = useCallback((animate: boolean) => {
    const ind = indicatorRef.current;
    const list = listRef.current;
    if (!ind || !list) return;
    const link = active ? list.querySelector<HTMLAnchorElement>(`a[data-id="${active}"]`) : null;
    if (!link) {
      ind.style.opacity = "0";
      placedRef.current = false;
      return;
    }
    const x = link.offsetLeft;
    const width = link.offsetWidth;
    const gsap = gsapRef.current;
    const shouldTween = animate && placedRef.current && gsap && !prefersReducedMotion();
    ind.style.opacity = "1";
    if (shouldTween) {
      gsap.to(ind, { x, width, duration: 0.4, ease: "power3.out", overwrite: true });
    } else if (gsap) {
      gsap.set(ind, { x, width });
    } else {
      ind.style.transform = `translateX(${x}px)`;
      ind.style.width = `${width}px`;
    }
    placedRef.current = true;
  }, [active]);

  useLayoutEffect(() => {
    placeIndicator(true);

    // Keep the active tab visible inside a scrolling row.
    const row = rowRef.current;
    const link = active ? listRef.current?.querySelector<HTMLAnchorElement>(`a[data-id="${active}"]`) : null;
    if (row && link && row.scrollWidth > row.clientWidth + 1) {
      const left = link.offsetLeft - (row.clientWidth - link.offsetWidth) / 2;
      row.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, [active, placeIndicator]);

  // Re-measure when fonts load or the row resizes, without tweening.
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => placeIndicator(false));
    ro.observe(list);
    document.fonts?.ready.then(() => placeIndicator(false)).catch(() => undefined);
    return () => ro.disconnect();
  }, [placeIndicator]);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const reduce = prefersReducedMotion();
    lockRef.current = { id, until: Date.now() + (reduce ? 100 : 1200) };
    setActive(id);
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav className={styles.nav} aria-label="Report sections">
      <p className={styles.label}>The receipts</p>
      <div className={styles.row} ref={rowRef}>
        <div className={styles.track}>
        <ul className={styles.list} ref={listRef}>
          {items.map((n) => (
            <li key={n.id}>
              <a
                href={`#${n.id}`}
                data-id={n.id}
                className={`${styles.link} ${active === n.id ? styles.active : ""}`}
                aria-current={active === n.id ? "location" : undefined}
                onClick={(e) => onClick(e, n.id)}
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <span className={styles.indicator} ref={indicatorRef} aria-hidden />
        </div>
      </div>
    </nav>
  );
}
