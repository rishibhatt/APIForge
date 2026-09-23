"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./ThemeToggle.module.css";

export interface ThemeToggleProps {
  t: TranslateFn;
  /** Compact icon button (e.g. landing header) vs default track switch */
  variant?: "switch" | "icon";
}

export default function ThemeToggle({
  t,
  variant = "switch",
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={variant === "icon" ? styles.iconPlaceholder : styles.placeholder}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  const label = isDark
    ? t("a11y.themeSwitchToLight")
    : t("a11y.themeSwitchToDark");

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={label}
        className={`${styles.iconBtn} focusRing`}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        <MaterialIcon name={isDark ? "light_mode" : "dark_mode"} size="md" />
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
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
