"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { selectRoastMeme } from "@/lib/roast/memeSelector";
import type { SanitizedRoastReport } from "@/lib/roast/types";
import { TIER_LABELS, tierFromScore, tierTone } from "./labels";
import styles from "./RoastPoster.module.css";

export interface RoastPosterProps {
  report: SanitizedRoastReport;
  affectedPercentage: number;
  variantNumber?: number;
}

interface Clip {
  id: string;
  src: string;
  caption: string;
}

const COUNT_MS = 900;

/** Render the roast's `inline code` spans as real code. */
function RoastText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i}>{part.slice(1, -1)}</code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function hostOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * The roast result as one screenshot-ready poster: meme clip with its caption, the score
 * stamp, the verdict, the roast, and APIForge attribution. Designed to be cropped and posted.
 */
export default function RoastPoster({ report, affectedPercentage, variantNumber = 1 }: RoastPosterProps) {
  const { summary } = report;
  const tier = summary.statusTier ?? tierFromScore(summary.score);
  const tone = tierTone(tier);
  const host = hostOf(report.specUrl);

  // Server-picked clip first so the shared link shows the same meme and caption.
  const [clip, setClip] = useState<Clip>(() => {
    if (summary.meme) return { id: summary.meme.id, src: summary.meme.src, caption: summary.meme.caption };
    const pick = selectRoastMeme(summary);
    return { id: pick.meme.id, src: pick.meme.src, caption: pick.caption };
  });
  const [recent, setRecent] = useState<string[]>([]);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Keep the caption in sync when "Roast it again" brings a new AI caption.
  useEffect(() => {
    if (summary.meme && summary.meme.id === clip.id && summary.meme.caption !== clip.caption) {
      setClip((c) => ({ ...c, caption: summary.meme!.caption }));
    }
  }, [summary.meme, clip.id, clip.caption]);

  // One authored moment: the score counts up while the tier stamp lands.
  const [display, setDisplay] = useState(0);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(summary.score);
      setLanded(true);
      setPlaying(false);
      videoRef.current?.pause();
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min((now - start) / COUNT_MS, 1);
      setDisplay(Math.round((1 - Math.pow(1 - t, 4)) * summary.score));
      if (t < 1) raf = requestAnimationFrame(step);
      else setLanded(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [summary.score]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) {
      void v.play();
      setPlaying(true);
    }
  };

  const nextClip = () => {
    const next = selectRoastMeme(summary, { excludeId: clip.id, recentMemeIds: recent });
    setRecent((r) => [...r.slice(-3), clip.id]);
    setClip({ id: next.meme.id, src: next.meme.src, caption: next.caption });
    setPlaying(true);
  };

  return (
    <section className={styles.poster} data-tone={tone} aria-labelledby="roast-verdict">
      <header className={styles.top}>
        <div className={styles.spec}>
          <p className={styles.specTitle} title={report.title}>
            {report.title}
          </p>
          {report.version ? <span className={styles.chip}>v{report.version}</span> : null}
          {host ? <span className={`${styles.chip} ${styles.chipHost}`}>{host}</span> : null}
        </div>
        <span className={styles.brandTag}>Roast my API</span>
      </header>

      <div className={styles.body}>
        <figure className={styles.meme}>
          <video
            ref={videoRef}
            key={clip.src}
            data-roast-meme
            className={styles.video}
            src={clip.src}
            muted={muted}
            autoPlay={playing}
            loop
            playsInline
            preload="auto"
            aria-label={`Reaction clip: ${clip.caption}`}
          />
          <figcaption className={styles.memeCaption}>{clip.caption}</figcaption>
          <div className={styles.memeControls}>
            <button type="button" className={styles.memeBtn} onClick={togglePlay} aria-label={playing ? "Pause clip" : "Play clip"}>
              <MaterialIcon name={playing ? "pause" : "play_arrow"} size="sm" />
            </button>
            <button type="button" className={styles.memeBtn} onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Mute"}>
              <MaterialIcon name={muted ? "volume_off" : "volume_up"} size="sm" />
            </button>
            <button type="button" className={`${styles.memeBtn} ${styles.memeBtnText}`} onClick={nextClip}>
              <MaterialIcon name="shuffle" size="sm" />
              <span>Another clip</span>
            </button>
          </div>
        </figure>

        <div className={styles.result}>
          <div className={styles.scoreRow}>
            <p className={styles.score} aria-label={`Score: ${summary.score} out of 100`}>
              <span className={styles.num}>{display}</span>
              <span className={styles.denom}>/100</span>
            </p>
            <span className={`${styles.stamp} ${landed ? styles.stampLanded : ""}`}>{TIER_LABELS[tier]}</span>
          </div>

          <h1 id="roast-verdict" className={styles.verdict}>
            {summary.verdict}
          </h1>

          <blockquote className={styles.roast} aria-live="polite">
            <p>
              <RoastText text={summary.roast} />
            </p>
          </blockquote>

          <dl className={styles.facts}>
            <div>
              <dt>Endpoints</dt>
              <dd>{summary.totalEndpoints}</dd>
            </div>
            <div>
              <dt>Issues</dt>
              <dd>{summary.totalFindings}</dd>
            </div>
            <div>
              <dt>Routes hit</dt>
              <dd>{affectedPercentage}%</dd>
            </div>
          </dl>
        </div>
      </div>

      <footer className={styles.foot}>
        <span>Roasted by apiforge.info/roast-my-api</span>
        <span>{variantNumber > 1 ? `Take ${variantNumber} · rule-based score` : "Rule-based score"}</span>
      </footer>
    </section>
  );
}
