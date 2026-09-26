"use client";

import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { CategoryHeatmapItem, DamageMetrics } from "@/lib/roast/presentationAdapter";
import styles from "./DamageSnapshot.module.css";

export interface DamageSnapshotProps {
  metrics: DamageMetrics;
  heatmap: CategoryHeatmapItem[];
}

export default function DamageSnapshot({ metrics, heatmap }: DamageSnapshotProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerTitleRow}>
          <MaterialIcon name="local_fire_department" className={styles.fireIcon} />
          <h3 className={styles.sectionTitle}>THE DAMAGE REPORT</h3>
        </div>
        <p className={styles.sectionSub}>&quot;Okay... here&apos;s where things got interesting.&quot;</p>
      </div>

      {/* 4-Metric Grid */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <MaterialIcon name="error_outline" className={styles.metricIconFire} />
            <span className={styles.metricVal}>{metrics.totalIssues}</span>
          </div>
          <span className={styles.metricLabel}>Total Issues</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <MaterialIcon name="warning" className={styles.metricIconWarn} />
            <span className={styles.metricVal}>{metrics.problemTypesCount}</span>
          </div>
          <span className={styles.metricLabel}>Problem Types</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <MaterialIcon name="alt_route" className={styles.metricIconRoute} />
            <span className={styles.metricVal}>{metrics.affectedEndpointsCount}</span>
          </div>
          <span className={styles.metricLabel}>Affected Routes</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <MaterialIcon name="pie_chart" className={styles.metricIconRate} />
            <span className={styles.metricVal}>{metrics.affectedPercentage}%</span>
          </div>
          <span className={styles.metricLabel}>Coverage Impact</span>
        </div>
      </div>

      {/* Heatmap Distribution Bar */}
      {heatmap.length > 0 ? (
        <div className={styles.heatmapCard}>
          <h4 className={styles.heatmapTitle}>WHERE THE PAIN IS</h4>

          <div className={styles.heatmapList}>
            {heatmap.slice(0, 5).map((item) => {
              const isSevere = item.count >= 5;
              const barClass = isSevere ? styles.barRed : styles.barOrange;

              return (
                <div key={item.category} className={styles.heatmapRow}>
                  <div className={styles.heatmapLabelGroup}>
                    <span className={styles.heatmapCategoryName}>
                      {item.category.toUpperCase().replace("-", " ")}
                    </span>
                    <span className={styles.heatmapCount}>{item.count}</span>
                  </div>

                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${barClass}`}
                      style={{ width: `${Math.max(8, item.percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
