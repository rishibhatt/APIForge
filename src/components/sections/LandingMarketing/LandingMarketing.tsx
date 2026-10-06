"use client";

import { useRef } from "react";
import Link from "next/link";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import SpecUrlForm from "@/components/sections/HeroSection/SpecUrlForm";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useWorkspaceStore } from "@/store/workspaceStore";
import ExploreMarquee from "./ExploreMarquee";
import FourTools from "./FourTools/FourTools";
import ScoreDemoSection from "./ScoreDemoSection/ScoreDemoSection";
import Workflow from "./Workflow/Workflow";
import styles from "./LandingMarketing.module.css";

export interface LandingMarketingProps {
  t: TranslateFn;
  isLoading: boolean;
  error: string | null;
  onForge: () => void;
}

const GITHUB_REPO_HREF = "https://github.com/rishibhatt/APIForge";

export default function LandingMarketing({ t, isLoading, error, onForge }: LandingMarketingProps) {
  const toggleSupportModal = useWorkspaceStore((s) => s.toggleSupportModal);
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollReveal(rootRef);

  return (
    <div ref={rootRef} className={styles.root}>
      <div data-reveal>
        <ExploreMarquee />
      </div>

      <FourTools />
      <ScoreDemoSection />
      <Workflow />

      <section className={styles.roastSection} aria-labelledby="roast-heading">
        <div className={styles.inner} data-reveal>
          <div className={`${styles.roast} roastZone`}>
            <div className={styles.roastCopy}>
              <h2 id="roast-heading" className={styles.roastTitle}>
                Ship it. We&apos;ll judge it.
              </h2>
              <p className={styles.roastBody}>
                Drop in a spec and get a roast written about your actual endpoints: a score, a
                reaction meme, the worst offences, and what to fix first.
              </p>
              <Link href="/roast-my-api" className={styles.roastBtn}>
                <span className={styles.fireEmoji} aria-hidden>
                  🔥
                </span>
                Roast my API
                <MaterialIcon name="arrow_forward" size="sm" className={styles.roastArrow} />
              </Link>
            </div>
            <div className={styles.roastCard} aria-hidden>
              <div className={styles.roastCardHead}>
                <span className={styles.roastScore}>
                  58<span>/100</span>
                </span>
                <span className={styles.roastStamp}>Chaotic</span>
              </div>
              <p className={styles.roastVerdict}>Works on my machine.</p>
              <p className={styles.roastLine}>
                <code>GET /pet/findByStatus</code> puts the verb in the URL, which is like
                labelling a door &ldquo;DOOR&rdquo;.
              </p>
              <span className={styles.roastFoot}>Example roast</span>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.ctaSection}`} aria-labelledby="cta-heading">
        <div className={`${styles.inner} ${styles.cta}`} data-reveal>
          <h2 id="cta-heading" className={styles.title}>
            Open your spec in APIForge
          </h2>
          <p className={styles.lede}>Free. No account, no install.</p>
          <SpecUrlForm
            id="landing-cta-url"
            t={t}
            isLoading={isLoading}
            error={error}
            onForge={onForge}
            size="hero"
          />
          <p className={styles.ctaFoot}>
            APIForge runs on free-tier AI models.{" "}
            <button type="button" className={styles.inlineLink} onClick={toggleSupportModal}>
              Support the project
            </button>{" "}
            or{" "}
            <a className={styles.inlineLink} href={GITHUB_REPO_HREF} target="_blank" rel="noopener noreferrer">
              star it on GitHub
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
