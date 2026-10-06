"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./content.module.css";

export interface GuideIndexItem {
  href: string;
  title: string;
  description: string;
  topic: string;
  topicLabel: string;
  readingTime?: string;
  date: string;
  dateLabel: string;
}

/**
 * Guides index: the newest guide leads, then a topic-filterable list.
 * Items arrive sorted newest first. The ?topic= query param preselects a filter (linked from article bylines).
 */
export default function GuideIndex({ items }: { items: GuideIndexItem[] }) {
  const [topic, setTopic] = useState<string>("all");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("topic");
    if (fromUrl && items.some((i) => i.topic === fromUrl)) setTopic(fromUrl);
  }, [items]);

  const topics = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const item of items) {
      const entry = counts.get(item.topic) ?? { label: item.topicLabel, count: 0 };
      entry.count += 1;
      counts.set(item.topic, entry);
    }
    return Array.from(counts.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [items]);

  const selectTopic = (id: string) => {
    setTopic(id);
    const url = new URL(window.location.href);
    if (id === "all") url.searchParams.delete("topic");
    else url.searchParams.set("topic", id);
    window.history.replaceState(null, "", url.toString());
  };

  const lead = topic === "all" ? items[0] : undefined;
  const list = topic === "all" ? items.slice(1) : items.filter((i) => i.topic === topic);

  return (
    <div>
      {lead && (
        <Link href={lead.href} className={styles.leadLink}>
          <span className={styles.leadTitle}>{lead.title}</span>
          <span className={styles.leadDesc}>{lead.description}</span>
          <span className={styles.leadFoot}>
            <span className={styles.leadMeta}>
              <span className={styles.leadBadge}>Latest</span>
              <time dateTime={lead.date}>{lead.dateLabel}</time>
              <span>{lead.topicLabel}</span>
              {lead.readingTime && <span>{lead.readingTime}</span>}
            </span>
            <span className={styles.leadArrow}>
              Read the guide
              <MaterialIcon name="arrow_forward" size="sm" />
            </span>
          </span>
        </Link>
      )}

      <div className={styles.filterBar} role="group" aria-label="Filter guides by topic">
        <button
          type="button"
          className={styles.filterChip}
          aria-pressed={topic === "all"}
          onClick={() => selectTopic("all")}
        >
          All <span className={styles.filterCount}>{items.length}</span>
        </button>
        {topics.map((t) => (
          <button
            key={t.id}
            type="button"
            className={styles.filterChip}
            aria-pressed={topic === t.id}
            onClick={() => selectTopic(t.id)}
          >
            {t.label} <span className={styles.filterCount}>{t.count}</span>
          </button>
        ))}
      </div>

      <ul className={styles.guideList} aria-live="polite" aria-label="Guides">
        {list.map((item) => (
          <li key={item.href} className={styles.guideRow}>
            <Link href={item.href} className={styles.guideRowLink}>
              <time className={styles.guideRowDate} dateTime={item.date}>
                {item.dateLabel}
              </time>
              <span className={styles.guideRowMain}>
                <span className={styles.guideRowTitle}>{item.title}</span>
                <span className={styles.guideRowDesc}>{item.description}</span>
              </span>
              <span className={styles.guideRowMeta}>
                <span>{item.topicLabel}</span>
                {item.readingTime && <span>{item.readingTime}</span>}
              </span>
              <MaterialIcon name="arrow_forward" size="sm" className={styles.rowArrow} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
