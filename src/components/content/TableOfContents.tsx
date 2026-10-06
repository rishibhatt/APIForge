"use client";

import { useEffect, useState } from "react";
import styles from "./content.module.css";

export interface TocItem {
  id: string;
  label: string;
}

/** Sticky "On this page" list that marks the section currently in view. */
export default function TableOfContents({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;

    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const firstVisible = targets.find((el) => visible.get(el.id));
        if (firstVisible) {
          setActive(firstVisible.id);
          return;
        }
        // Between headings: keep the last heading scrolled past.
        const passed = targets.filter((el) => el.getBoundingClientRect().top < 120);
        if (passed.length > 0) setActive(passed[passed.length - 1].id);
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className={styles.toc} aria-label="On this page">
      <p className={styles.tocTitle}>On this page</p>
      <ul className={styles.tocList}>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`${styles.tocLink} ${active === item.id ? styles.tocLinkActive : ""}`}
              aria-current={active === item.id ? "location" : undefined}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
