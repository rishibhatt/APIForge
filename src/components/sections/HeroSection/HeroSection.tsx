"use client";

import { useEffect, useRef } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { useWorkspaceStore } from "@/store/workspaceStore";
import SpecUrlForm from "./SpecUrlForm";
import styles from "./HeroSection.module.css";

export interface HeroSectionProps {
  t: TranslateFn;
  isLoading: boolean;
  error: string | null;
  onForge: () => void;
  onSelectSampleUrl?: (url: string) => void;
}

export const SAMPLE_SPECS = [
  { label: "Swagger Petstore", meta: "20 endpoints", tone: "violet", url: "https://petstore.swagger.io/" },
  {
    label: "Fake REST API",
    meta: "27 endpoints",
    tone: "green",
    url: "https://fakerestapi.azurewebsites.net/index.html",
  },
] as const;

export default function HeroSection({
  t,
  isLoading,
  error,
  onForge,
  onSelectSampleUrl,
}: HeroSectionProps) {
  const setSpecUrlInput = useWorkspaceStore((s) => s.setSpecUrlInput);

  // Deep link: /?spec=<url> opens that spec straight in the workspace.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const spec = new URLSearchParams(window.location.search).get("spec");
    if (!spec || !/^https?:\/\//i.test(spec)) return;
    // Consume the param so returning to the landing page never re-parses it.
    const url = new URL(window.location.href);
    url.searchParams.delete("spec");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    setSpecUrlInput(spec);
    if (onSelectSampleUrl) onSelectSampleUrl(spec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectSample = (url: string) => {
    setSpecUrlInput(url);
    if (onSelectSampleUrl) {
      onSelectSampleUrl(url);
    } else {
      setTimeout(onForge, 50);
    }
  };

  return (
    <section className={styles.hero} id="parse-api" aria-labelledby="hero-heading">
      <div className={styles.atmosphere} aria-hidden />
      <div className={`gridBackdrop ${styles.grid}`} aria-hidden />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 id="hero-heading" className={styles.title}>
            <span className={styles.titleLine}>Parse, test, and grade</span>{" "}
            <span className={`${styles.titleLine} ${styles.titleAccent}`}>any OpenAPI or Swagger spec.</span>
          </h1>

          <p className={styles.lede}>
            A free online OpenAPI and Swagger tool. Paste a spec URL to parse it, send requests
            without CORS errors, validate responses against the schema, score the API design from
            0 to 100, and generate TypeScript types and tests.
          </p>

          <div className={styles.formSlot}>
            <SpecUrlForm
              id="landing-forge-url"
              t={t}
              isLoading={isLoading}
              error={error}
              onForge={onForge}
              autoFocus
              size="hero"
            />
          </div>

          <div className={styles.samples}>
            <p className={styles.samplesLabel}>No spec handy? Try one:</p>
            <ul className={styles.chipList}>
              {SAMPLE_SPECS.map((s) => (
                <li key={s.url}>
                  <button
                    type="button"
                    className={`${styles.chip} ${styles[`chip_${s.tone}`]}`}
                    onClick={() => handleSelectSample(s.url)}
                    disabled={isLoading}
                  >
                    <span className={styles.chipDot} aria-hidden />
                    <span className={styles.chipName}>{s.label}</span>
                    <span className={styles.chipMeta}>{s.meta}</span>
                    <MaterialIcon name="arrow_forward" size="xs" className={styles.chipArrow} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
