import styles from "./AiShimmer.module.css";

const WIDTHS = [94, 82, 88, 58, 72];

interface AiShimmerProps {
  /** 3 to 5. */
  lines?: number;
  className?: string;
}

/** Skeleton lines shown before the first token. Decorative: pair with a status line for screen readers. */
export default function AiShimmer({ lines = 4, className = "" }: AiShimmerProps) {
  const n = Math.min(5, Math.max(3, lines));
  return (
    <div className={`${styles.wrap} ${className}`.trim()} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={styles.line}
          style={{ width: `${WIDTHS[i % WIDTHS.length]}%`, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}
