"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./ThemeToggle.module.css";

export interface ThemeToggleProps {
  t: TranslateFn;
}

export default function ThemeToggle({ t }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={styles.placeholder} aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={
        isDark ? t("a11y.themeSwitchToLight") : t("a11y.themeSwitchToDark")
      }
      className={`${styles.switch} ${isDark ? styles.isDark : ""} focusRing`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className={styles.track}>
        <span className={styles.thumb}>
          <MaterialIcon
            name={isDark ? "dark_mode" : "light_mode"}
            size="sm"
          />
        </span>
      </span>
    </button>
  );
}
