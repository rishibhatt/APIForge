"use client";

import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { RoastStrength } from "@/lib/roast/types";
import styles from "./RoastStrengths.module.css";

export interface RoastStrengthsProps {
  strengths: RoastStrength[];
}

export default function RoastStrengths({ strengths }: RoastStrengthsProps) {
  if (strengths.length === 0) return null;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>
        <MaterialIcon name="auto_awesome" />
        <span>OKAY, YOU DIDN&apos;T TOTALLY COOK IT</span>
      </h3>

      <div className={styles.grid}>
        {strengths.map((item) => (
          <div key={item.title} className={styles.card}>
            <div className={styles.iconTitle}>
              <MaterialIcon name="check_circle" className={styles.checkIcon} />
              <h4 className={styles.title}>{item.title}</h4>
            </div>
            <p className={styles.desc}>{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
