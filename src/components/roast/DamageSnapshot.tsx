import type { CategoryHeatmapItem } from "@/lib/roast/presentationAdapter";
import { categoryLabel } from "./labels";
import shared from "./RoastSection.module.css";
import styles from "./DamageSnapshot.module.css";

export interface DamageSnapshotProps {
  heatmap: CategoryHeatmapItem[];
  totalIssues: number;
}

export default function DamageSnapshot({ heatmap, totalIssues }: DamageSnapshotProps) {
  if (heatmap.length === 0) return null;
  const max = Math.max(...heatmap.map((h) => h.count), 1);

  return (
    <section id="categories" className={shared.section} aria-labelledby="categories-title">
      <div className={shared.head} data-reveal>
        <h2 id="categories-title" className={shared.title}>
          Where the issues are
        </h2>
        <p className={shared.lede}>
          {totalIssues} {totalIssues === 1 ? "issue" : "issues"} across {heatmap.length}{" "}
          {heatmap.length === 1 ? "category" : "categories"}
        </p>
      </div>

      <ul className={styles.list} data-reveal-group>
        {heatmap.map((item) => (
          <li key={item.category} className={styles.row} data-reveal-item>
            <span className={styles.label}>{categoryLabel(item.category)}</span>
            <div className={shared.meter} aria-hidden>
              <div
                className={`${shared.meterFill} ${shared.accent}`}
                data-grow={item.count / max}
                style={{ transform: `scaleX(${item.count / max})` }}
              />
            </div>
            <span className={styles.count}>
              {item.count}
              <span className={styles.pct}>{item.percentage}%</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
