"use client";

import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./RoastHero.module.css";

export interface RoastHeroProps {
  onSelectDemo: (url: string) => void;
}

const DEMO_SPECS = [
  { label: "Petstore API", url: "https://petstore.swagger.io/v2/swagger.json" },
  { label: "HTTPBin API", url: "https://httpbin.org/spec.json" },
];

export default function RoastHero({ onSelectDemo }: RoastHeroProps) {
  return (
    <section className={styles.hero}>
      <h1 className={styles.headline}>
        SHIP IT. <br />
        <span className={styles.coralGradient}>WE&apos;LL JUDGE IT.</span>
      </h1>

      <p className={styles.subhead}>
        Paste your OpenAPI spec. We&apos;ll find the issues your API thought nobody would notice.
      </p>

      <div className={styles.demoContainer}>
        <span className={styles.demoLabel}>Try a sample API:</span>
        {DEMO_SPECS.map((demo) => (
          <button
            key={demo.label}
            type="button"
            className={styles.demoBtn}
            onClick={() => onSelectDemo(demo.url)}
          >
            <MaterialIcon name="terminal" size="sm" />
            <span>{demo.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
