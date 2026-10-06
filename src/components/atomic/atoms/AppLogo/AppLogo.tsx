"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { APP_LOGO_PATH } from "@/constants/assets";
import styles from "./AppLogo.module.css";

export interface AppLogoProps {
  /** Display height in px; width follows aspect ratio */
  size?: number;
  /** Cap width so wide marks don’t dominate the header */
  maxWidth?: number;
  className?: string;
  priority?: boolean;
  /** Next/Image quality (1–100); higher keeps fine marks sharp when scaled up */
  quality?: number;
  /** Custom logo source path, defaults to APP_LOGO_PATH */
  src?: string;
}

export default function AppLogo({
  size = 42,
  maxWidth = 180,
  className = "",
  priority = false,
  quality = 95,
  src = APP_LOGO_PATH,
}: AppLogoProps) {
  return (
    <span
      className={`${styles.wrap} ${className}`.trim()}
      style={
        {
          "--app-logo-size": `${size}px`,
          "--app-logo-max-w": `${maxWidth}px`,
        } as CSSProperties
      }
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={styles.img}
        priority={priority}
        quality={quality}
        sizes={`${size}px`}
      />
    </span>
  );
}
