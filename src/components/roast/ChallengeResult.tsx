"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { toast } from "@/components/providers/Toaster/toast";
import shared from "./RoastSection.module.css";
import styles from "./ChallengeResult.module.css";

export interface ChallengeResultProps {
  /** The user's score from this roast. */
  score: number;
  /** The friend's score from the challenge link. */
  beat: number;
  /** Friend's API title, plain text. May be empty. */
  from: string;
  /** Title of the API the user just roasted; used in the return challenge link. */
  title: string;
  onRoastAnother: () => void;
}

export function buildChallengeUrl(origin: string, score: number, title: string): string {
  return `${origin}/roast-my-api?beat=${score}&from=${encodeURIComponent(title.slice(0, 60))}`;
}

export default function ChallengeResult({ score, beat, from, title, onRoastAnother }: ChallengeResultProps) {
  const youRef = useRef<HTMLSpanElement | null>(null);
  const friendRef = useRef<HTMLSpanElement | null>(null);

  const delta = score - beat;
  const verdict =
    delta > 0 ? `You win by ${delta}` : delta < 0 ? `Friend wins by ${Math.abs(delta)}` : "Dead heat";
  const tone = delta > 0 ? "win" : delta < 0 ? "lose" : "tie";

  useEffect(() => {
    const you = youRef.current;
    const friend = friendRef.current;
    if (!you || !friend || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.fromTo(
      [you, friend],
      { scaleX: 0 },
      { scaleX: (i: number) => (i === 0 ? score : beat) / 100, duration: 0.9, ease: "power3.out", stagger: 0.12, delay: 0.1 },
    );
    return () => {
      tween.kill();
    };
  }, [score, beat]);

  const challengeBack = async () => {
    const link = buildChallengeUrl(window.location.origin, score, title);
    const message = `I scored ${score}/100 on APIForge's Roast My API. Can yours beat it? ${link}`;
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Challenge copied", {
        description: "Paste it to your friend. The link carries your score.",
        id: "roast-challenge-copy",
      });
    } catch {
      toast.warning("Couldn't copy automatically", {
        description: `Copy this link instead: ${link}`,
        id: "roast-challenge-copy",
        duration: 12000,
      });
    }
  };

  return (
    <section className={styles.strip} data-tone={tone} aria-label="Challenge result">
      <div className={styles.head}>
        <p className={styles.verdict} aria-live="polite">
          {verdict}
        </p>
        <p className={styles.sub}>
          {from ? `Against ${from}` : "Against your friend's API"}
        </p>
      </div>

      <div className={styles.bars}>
        <div className={styles.row}>
          <span className={styles.who}>You</span>
          <span className={styles.track} role="img" aria-label={`You: ${score} out of 100`}>
            <span ref={youRef} className={`${styles.fill} ${styles.fillYou}`} style={{ transform: `scaleX(${score / 100})` }} />
          </span>
          <span className={styles.num}>{score}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.who}>Friend</span>
          <span className={styles.track} role="img" aria-label={`Friend: ${beat} out of 100`}>
            <span ref={friendRef} className={`${styles.fill} ${styles.fillFriend}`} style={{ transform: `scaleX(${beat / 100})` }} />
          </span>
          <span className={styles.num}>{beat}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={shared.btn} onClick={challengeBack}>
          Challenge them back
        </button>
        <button type="button" className={shared.btnSecondary} onClick={onRoastAnother}>
          Roast another API
        </button>
      </div>
    </section>
  );
}
