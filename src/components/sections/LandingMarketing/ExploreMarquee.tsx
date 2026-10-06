"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./ExploreMarquee.module.css";

type Tag = { label: string; note: string; href: string };

/* Internal links to real pages: they help visitors find the free tools and help crawlers reach them. */
/* One list, tools and guides alternating, so the single row never reads as two lists. */
const TAGS: Tag[] = [
  { label: "OpenAPI validator", note: "Check a 3.x file for errors", href: "/openapi-validator" },
  { label: "OpenAPI best practices", note: "Write a cleaner spec", href: "/guides/openapi-best-practices" },
  { label: "API quality score", note: "Grade the design from 0 to 100", href: "/api-score" },
  { label: "REST API design", note: "Naming, verbs, status codes", href: "/guides/rest-api-design-best-practices" },
  { label: "API quality checker", note: "Find naming and error issues", href: "/api-quality-checker" },
  { label: "API error handling", note: "Consistent error responses", href: "/guides/rest-api-error-handling" },
  { label: "REST API testing", note: "Send requests, check responses", href: "/api-testing" },
  { label: "API versioning", note: "Change it without breaking clients", href: "/guides/api-versioning-best-practices" },
  { label: "Swagger validator", note: "Check a 2.0 file for errors", href: "/swagger-validator" },
  { label: "Swagger vs OpenAPI", note: "What changed and why", href: "/guides/swagger-vs-openapi" },
  { label: "OpenAPI examples", note: "Good and bad specs side by side", href: "/examples" },
  { label: "API glossary", note: "Plain-language definitions", href: "/glossary" },
];

function TagLink({ tag, tabIndex }: { tag: Tag; tabIndex?: number }) {
  return (
    <Link href={tag.href} className={styles.tag} title={tag.note} tabIndex={tabIndex}>
      <span className={styles.name}>{tag.label}</span>
      <MaterialIcon name="arrow_forward" size="xs" className={styles.arrow} />
    </Link>
  );
}

function Row({ tags, label }: { tags: Tag[]; label: string }) {
  const rowRef = useRef<HTMLDivElement>(null);

  // The CSS animation is the baseline; GSAP only eases its speed on hover so slowing down is smooth.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    let off: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;
      const track = row.querySelector<HTMLElement>("[data-track]");
      const anim = track?.getAnimations()[0];
      if (!anim) return;
      const rate = { v: 1 };
      const to = (v: number, d: number) =>
        gsap.to(rate, {
          v,
          duration: d,
          ease: "power2.out",
          overwrite: true,
          onUpdate: () => anim.updatePlaybackRate(rate.v),
        });
      const slow = () => to(0.12, 0.6);
      const fast = () => to(1, 0.8);
      row.addEventListener("pointerenter", slow);
      row.addEventListener("pointerleave", fast);
      row.addEventListener("focusin", slow);
      row.addEventListener("focusout", fast);
      off = () => {
        row.removeEventListener("pointerenter", slow);
        row.removeEventListener("pointerleave", fast);
        row.removeEventListener("focusin", slow);
        row.removeEventListener("focusout", fast);
        gsap.killTweensOf(rate);
      };
    })();
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  return (
    <div ref={rowRef} className={styles.row} role="group" aria-label={label}>
      <div className={styles.track} data-track>
        <ul className={styles.group}>
          {tags.map((t) => (
            <li key={t.href}>
              <TagLink tag={t} />
            </li>
          ))}
        </ul>
        <ul
          className={styles.group}
          aria-hidden
          ref={(el) => {
            // The looped copy adds no tab stops and no duplicate links for assistive tech.
            el?.setAttribute("inert", "");
          }}
        >
          {tags.map((t) => (
            <li key={t.href}>
              <TagLink tag={t} tabIndex={-1} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ExploreMarquee() {
  return (
    <nav className={styles.wrap} aria-label="Free OpenAPI tools and guides">
      <Row tags={TAGS} label="Free tools and guides" />
    </nav>
  );
}
