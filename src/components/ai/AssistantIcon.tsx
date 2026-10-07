import styles from "./AssistantIcon.module.css";

interface AssistantIconProps {
  /** 20 to 40. */
  size?: number;
  className?: string;
  /** Blink the eyes every few seconds. Off for static uses (message avatars in long threads). */
  animated?: boolean;
  /** Provide when the icon stands alone; otherwise it is decorative. */
  title?: string;
}

/** APIForge Assistant mark: a small robot head with an antenna, blinking eyes, and a spark. */
export default function AssistantIcon({
  size = 24,
  className = "",
  animated = true,
  title,
}: AssistantIconProps) {
  const px = Math.min(40, Math.max(20, size));
  return (
    <svg
      className={`${styles.icon} ${className}`.trim()}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {/* antenna */}
      <path d="M11 7.5V5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="11" cy="4" r="1.5" fill="currentColor" />
      {/* spark */}
      <path
        d="M19 2.2l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"
        fill="currentColor"
        className={animated ? styles.spark : undefined}
      />
      {/* ears */}
      <path d="M3.6 13v3M18.4 13v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* face */}
      <rect x="5" y="7.5" width="12.8" height="11.5" rx="3.4" stroke="currentColor" strokeWidth="1.6" />
      {/* eyes */}
      <g className={animated ? styles.eyes : undefined}>
        <rect x="8.2" y="11.2" width="2" height="3" rx="1" fill="currentColor" />
        <rect x="12.6" y="11.2" width="2" height="3" rx="1" fill="currentColor" />
      </g>
      {/* mouth */}
      <path d="M9.4 16.6h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
