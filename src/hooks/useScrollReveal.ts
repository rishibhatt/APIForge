"use client";

import { useEffect, type RefObject } from "react";

/**
 * Landing-page scroll motion, powered by GSAP + ScrollTrigger (loaded on demand so they stay out
 * of the initial bundle). Markup opts in with data attributes inside `scope`:
 *
 *   data-reveal          single element eases up into place
 *   data-reveal-group    its [data-reveal-item] children rise in a stagger with a soft settle
 *   data-zoom            the element eases from a slight zoom to rest as it scrolls through the viewport
 *   data-beam            gets a --beam CSS variable (0 to 1) tied to scroll position
 *
 * Everything is skipped under prefers-reduced-motion, and content is visible until the script runs.
 */
export function useScrollReveal(scope: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let revert: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      const root = scope.current;
      if (cancelled || !root) return;
      gsap.registerPlugin(ScrollTrigger);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = <E extends Element>(sel: string) => gsap.utils.toArray<E>(sel, root);

        q<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, {
            autoAlpha: 0,
            y: 32,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        q<HTMLElement>("[data-reveal-group]").forEach((group) => {
          const items = group.querySelectorAll("[data-reveal-item]");
          if (!items.length) return;
          gsap.from(items, {
            autoAlpha: 0,
            y: 40,
            scale: 0.96,
            duration: 0.85,
            ease: "back.out(1.3)",
            stagger: 0.1,
            scrollTrigger: { trigger: group, start: "top 86%", once: true },
          });
        });

        q<HTMLElement>("[data-zoom]").forEach((el) => {
          gsap.fromTo(
            el,
            { scale: 1.08 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "center center", scrub: 0.8 },
            },
          );
        });

        q<HTMLElement>("[data-beam]").forEach((el) => {
          gsap.fromTo(
            el,
            { "--beam": 0 },
            {
              "--beam": 1,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 55%", scrub: 0.6 },
            },
          );
        });
      });

      revert = () => mm.revert();
      // Layout can shift once images and fonts land; recompute trigger positions after load.
      const refresh = () => ScrollTrigger.refresh();
      if (document.readyState === "complete") window.setTimeout(refresh, 300);
      else window.addEventListener("load", refresh, { once: true });
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [scope]);
}
