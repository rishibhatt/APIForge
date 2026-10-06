"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { TIER_LABEL, TIER_ORDER, type Contributor, type ContributorTier } from "@/lib/support/contributors";
import { BUY_ME_A_COFFEE_URL } from "@/lib/support/links";
import styles from "./Support.module.css";

const COLLAPSE_AFTER = 18;
const HUES = ["--color-primary", "--color-method-get", "--color-method-put-patch", "--color-rose"] as const;

function stableHash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string): string {
  const parts = name.replace(/[^A-Za-z0-9À-￿\s-]/g, "").split(/[\s-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}

function sinceLabel(since?: string): string | null {
  if (!since || !/^\d{4}-\d{2}$/.test(since)) return null;
  const [y, m] = since.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en", { month: "short", timeZone: "UTC" });
  return `${month} ${y}`;
}

function hostOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function Avatar({ c }: { c: Contributor }) {
  const [failed, setFailed] = useState(false);
  const hue = HUES[stableHash(c.id) % HUES.length];
  if (c.avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.avatarImg}
        src={c.avatarUrl}
        alt=""
        width={64}
        height={64}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className={styles.avatarInitials}
      style={{ ["--hue" as string]: `var(${hue})` }}
      aria-hidden
    >
      {initials(c.name)}
    </span>
  );
}

function Tile({ c }: { c: Contributor }) {
  const since = sinceLabel(c.since);
  const host = hostOf(c.url);
  const tier = TIER_LABEL[c.tier].singular;
  const face = (
    <>
      <span className={styles.avatar}>
        <Avatar c={c} />
      </span>
      <span className={styles.tileText}>
        <span className={styles.tileName}>{c.name}</span>
        {c.handle ? <span className={styles.tileHandle}>@{c.handle}</span> : null}
        <span className={styles.chipRow}>
          <span className={styles.chip}>{tier}</span>
          {c.example ? <span className={`${styles.chip} ${styles.chipExample}`}>Example</span> : null}
        </span>
      </span>
      <span className={styles.tileDetail}>
        {c.note ? <span className={styles.detailNote}>{c.note}</span> : null}
        <span className={styles.detailMeta}>
          {since ? `${tier} since ${since}` : tier}
          {host ? ` · ${host}` : ""}
        </span>
      </span>
    </>
  );

  return (
    <li className={styles.tileItem} data-reveal-item data-contributor-tile>
      {c.url ? (
        <a className={styles.tile} href={c.url} target="_blank" rel="noopener noreferrer" aria-label={`${c.name}, ${tier}${c.example ? ", example entry" : ""}`}>
          {face}
        </a>
      ) : (
        <div className={styles.tile} tabIndex={0} role="group" aria-label={`${c.name}, ${tier}${c.example ? ", example entry" : ""}`}>
          {face}
        </div>
      )}
    </li>
  );
}

function BecomeTile() {
  return (
    <li className={styles.tileItem} data-reveal-item>
      <a className={`${styles.tile} ${styles.tileJoin}`} href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer">
        <span className={`${styles.avatar} ${styles.avatarJoin}`} aria-hidden>
          <span className={styles.avatarInitials} style={{ ["--hue" as string]: "var(--color-primary)" }}>
            +
          </span>
        </span>
        <span className={styles.tileText}>
          <span className={styles.tileName}>Become a supporter</span>
          <span className={styles.tileHandle}>Your name goes here</span>
        </span>
      </a>
    </li>
  );
}

function TierGroup({ tier, people, last }: { tier: ContributorTier; people: Contributor[]; last: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const hidden = Math.max(0, people.length - COLLAPSE_AFTER);
  const visible = expanded ? people : people.slice(0, COLLAPSE_AFTER);
  const label = TIER_LABEL[tier];

  const showMore = useCallback(async () => {
    const before = listRef.current?.querySelectorAll("[data-contributor-tile]").length ?? 0;
    setExpanded(true);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const all = listRef.current?.querySelectorAll<HTMLElement>("[data-contributor-tile]");
    if (!all || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fresh = Array.from(all).slice(before);
    if (!fresh.length) return;
    const { gsap } = await import("gsap");
    gsap.from(fresh, { autoAlpha: 0, y: 16, duration: 0.5, ease: "expo.out", stagger: 0.03 });
  }, []);

  return (
    <section className={styles.tierGroup} aria-labelledby={`tier-${tier}`}>
      <h3 id={`tier-${tier}`} className={styles.tierTitle}>
        {people.length === 1 ? label.singular : label.plural}
        <span className={styles.tierCount}>{people.length}</span>
      </h3>
      <ul ref={listRef} className={styles.tileGrid} data-reveal-group>
        {visible.map((c) => (
          <Tile key={c.id} c={c} />
        ))}
        {last ? <BecomeTile /> : null}
      </ul>
      {hidden > 0 && !expanded ? (
        <button type="button" className={styles.btnSecondary} onClick={showMore}>
          Show {hidden} more
        </button>
      ) : null}
    </section>
  );
}

export default function ContributorGrid({ contributors }: { contributors: Contributor[] }) {
  const groups = useMemo(
    () =>
      TIER_ORDER.map((tier) => ({ tier, people: contributors.filter((c) => c.tier === tier) })).filter(
        (g) => g.people.length > 0,
      ),
    [contributors],
  );
  const total = contributors.filter((c) => !c.example).length;
  const hasExamples = contributors.some((c) => c.example);

  return (
    <div>
      <div className={styles.sectionHead}>
        <h2 id="contributors-title" className={styles.h2} data-reveal>
          Contributors
          <span className={styles.totalCount}>{total}</span>
        </h2>
        <p className={styles.sectionLede}>
          People who fund APIForge or have sent code to it. GitHub contributors are added automatically.
        </p>
        {hasExamples ? (
          <p className={styles.exampleNote}>
            Entries tagged Example are placeholders that show how the list looks. They are not real people and are not
            in the count.
          </p>
        ) : null}
      </div>
      {groups.map((g, i) => (
        <TierGroup key={g.tier} tier={g.tier} people={g.people} last={i === groups.length - 1} />
      ))}
    </div>
  );
}
