"use client";

import { useCallback, useRef, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { useSwaggerParser } from "@/hooks/useSwaggerParser";
import styles from "./HeroSection.module.css";

interface HeroSectionProps {
  t: TranslateFn;
}

export default function HeroSection({ t }: HeroSectionProps) {
  const [url, setUrl] = useState("");
  const { parseUrl, parseFile, isLoading, error } = useSwaggerParser();
  const fileRef = useRef<HTMLInputElement>(null);

  const onForge = useCallback(() => {
    const target = url.trim();
    if (!target) return;
    void parseUrl(target);
  }, [url, parseUrl]);

  const onPickFile = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void parseFile(f);
      e.target.value = "";
    },
    [parseFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) void parseFile(f);
    },
    [parseFile],
  );

  return (
    <section className={styles.section}>
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.inner}>
          <h1 className={styles.title}>{t("hero.title")}</h1>
          <p className={styles.subtitle}>{t("hero.subtitle")}</p>
          <div className={styles.rowWrap}>
            <div className={styles.inputRow}>
              <MaterialIcon name="link" className={styles.linkIcon} size="md" />
              <label htmlFor="forge-url" className="srOnly">
                {t("hero.inputPlaceholder")}
              </label>
              <input
                id="forge-url"
                type="url"
                name="url"
                autoComplete="url"
                placeholder={t("hero.inputPlaceholder")}
                className={`${styles.input} focusRing`}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onForge();
                }}
              />
              <button
                type="button"
                className={`${styles.forgeBtn} focusRing`}
                onClick={onForge}
                disabled={isLoading}
              >
                {isLoading ? t("common.loading") : t("hero.forgeCta")}
              </button>
            </div>
            <input
              ref={fileRef}
              className={styles.hiddenInput}
              type="file"
              accept=".json,.yaml,.yml,application/json,text/yaml"
              onChange={onFileChange}
              aria-hidden
            />
            <button
              type="button"
              className={`${styles.dropzone} focusRing`}
              onClick={onPickFile}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              <MaterialIcon name="upload_file" className={styles.linkIcon} />
              <span className={styles.dropLabel}>{t("hero.dropzone")}</span>
            </button>
            {error ? <p className={styles.error}>{error}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
