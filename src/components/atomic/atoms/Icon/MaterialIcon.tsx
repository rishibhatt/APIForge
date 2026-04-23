import type { BaseComponentProps } from "@/types/ui";
import styles from "./MaterialIcon.module.css";

interface MaterialIconProps extends BaseComponentProps {
  name: string;
  decorative?: boolean;
  size?: "md" | "sm" | "xs";
  scale75?: boolean;
}

export default function MaterialIcon({
  name,
  className = "",
  decorative = true,
  size = "md",
  scale75 = false,
}: MaterialIconProps) {
  const sz = size === "sm" ? styles.sm : size === "xs" ? styles.xs : "";
  const sc = scale75 ? styles.scale75 : "";
  return (
    <span
      className={`materialSymbols ${styles.icon} ${sz} ${sc} ${className}`.trim()}
      aria-hidden={decorative}
    >
      {name}
    </span>
  );
}
