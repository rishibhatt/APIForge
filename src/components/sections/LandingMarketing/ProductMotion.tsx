"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/*
 * Page-level motion for the product pages. Renders the page's <main> and:
 *  - staggers the hero copy in on load ([data-hero]) and pops the fact chips ([data-pop])
 *  - wipes the demo panel in ([data-demo]) and then steps its rows in once
 *  - hands scroll reveals ([data-reveal], [data-reveal-group], [data-zoom]) to useScrollReveal
 *  - staggers list / table rows ([data-rows]) as they scroll into view
 * Server markup is fully visible; everything below runs after mount and is skipped under
 * prefers-reduced-motion.
 */
export default function ProductMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useScrollReveal(ref);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const late: gsap.core.Tween[] = [];
    let cancelled = false;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(q("[data-hero]"), { autoAlpha: 0, y: 22, duration: 0.7, stagger: 0.09, clearProps: "transform,opacity,visibility" }, 0);
      tl.from(
        q("[data-pop]"),
        { autoAlpha: 0, scale: 0.8, y: 8, duration: 0.5, stagger: 0.06, ease: "back.out(1.8)", clearProps: "transform,opacity,visibility" },
        0.55,
      );

      const demo = root.querySelector<HTMLElement>("[data-demo]");
      if (demo) {
        tl.from(
          demo,
          {
            autoAlpha: 0,
            x: 28,
            clipPath: "inset(0 0 100% 0 round 8px)",
            duration: 0.95,
            ease: "power4.out",
            clearProps: "transform,opacity,visibility,clipPath",
          },
          0.2,
        );
        // Rows inside the shared Demos panels: log lines, endpoint rows, score pillars, tests, fix row.
        const rows = demo.querySelectorAll(
          'ol > li, ul > li, [class*="Demos_endpoint__"], [class*="Demos_fixRow__"], [class*="Demos_issue__"], [class*="Demos_responseHead__"]',
        );
        if (rows.length) {
          tl.from(
            rows,
            { autoAlpha: 0, x: -14, duration: 0.45, stagger: 0.08, ease: "power2.out", clearProps: "transform,opacity,visibility" },
            0.8,
          );
        }
      }

      // Lists and tables further down the page: rows step in as the block scrolls into view.
      (async () => {
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        gsap.utils.toArray<HTMLElement>("[data-rows]", root).forEach((block) => {
          const rows = block.querySelectorAll(":scope > li, :scope > tr");
          if (!rows.length) return;
          const tw = gsap.from(rows, {
            autoAlpha: 0,
            x: -16,
            duration: 0.55,
            ease: "power2.out",
            stagger: 0.07,
            clearProps: "transform,opacity,visibility",
            scrollTrigger: { trigger: block, start: "top 90%", once: true },
          });
          late.push(tw);
        });
      })();
    });


    return () => {
      cancelled = true;
      late.forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
      mm.revert();
    };
  }, []);

  return <main ref={ref}>{children}</main>;
}
