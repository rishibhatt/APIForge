import Image from "next/image";
import { ROAST_LOGO_PATH } from "@/constants/assets";
import styles from "./FireIcon.module.css";

export interface FireIconProps {
  /** Rendered size in px (square). */
  size?: number;
  className?: string;
}

/** The Roast mark (logo-fire.png). Use wherever a Roast surface needs an icon. */
export default function FireIcon({ size = 20, className = "" }: FireIconProps) {
  return (
    <Image
      src={ROAST_LOGO_PATH}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`${styles.fire} ${className}`.trim()}
    />
  );
}
