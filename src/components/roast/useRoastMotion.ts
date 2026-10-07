"use client";

import { useEffect, type RefObject } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/**
 * Roast-page motion on top of the landing reveal hook. Markup opts in with data attributes:
 *
 *   data-reveal / data-reveal-group + data-reveal-item   handled by useScrollReveal
 *   data-grow="0.62"    a meter fill: its inline scaleX(0.62) is the SSR value; it grows from 0 on reveal
 *   data-countup="87"   a number that counts up from 0 once when it scrolls into view (SSR text is the final value)
 *   data-rise           one-time mount entrance, rises 24px without overshoot
 *
 * Content is fully visible before the script runs and everything is skipped under reduced motion.
 */
export function useRoastMotion(scope: RefObject<HTMLElement | null>) {
  useScrollReveal(scope);

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
        gsap.utils.toArray<HTMLElement>("[data-rise]", root).forEach((el) => {
          gsap.from(el, { y: 24, autoAlpha: 0, duration: 0.8, ease: "power3.out", clearProps: "transform,opacity,visibility" });
        });

        gsap.utils.toArray<HTMLElement>("[data-grow]", root).forEach((el) => {
          const target = Number(el.dataset.grow);
          if (!Number.isFinite(target)) return;
          gsap.fromTo(
            el,
            { scaleX: 0 },
            {
              scaleX: target,
              duration: 1,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 94%", once: true },
            },
          );
        });

        const restore: (() => void)[] = [];
        gsap.utils.toArray<HTMLElement>("[data-countup]", root).forEach((el) => {
          const target = Number(el.dataset.countup);
          if (!Number.isFinite(target)) return;
          // Write into React's own text node so a later re-render still updates it.
          const node = el.firstChild;
          if (!node) return;
          const state = { v: 0 };
          node.nodeValue = "0";
          gsap.to(state, {
            v: target,
            duration: 1.1,
            ease: "power3.out",
            onUpdate: () => {
              node.nodeValue = String(Math.round(state.v));
            },
            scrollTrigger: { trigger: el, start: "top 94%", once: true },
          });
          restore.push(() => {
            node.nodeValue = String(target);
          });
        });
        return () => restore.forEach((fn) => fn());
      });
      revert = () => mm.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [scope]);
}
