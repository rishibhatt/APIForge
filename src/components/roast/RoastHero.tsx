"use client";

import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./RoastHero.module.css";

export interface RoastHeroProps {
  onSelectDemo: (url: string) => void;
}

const DEMO_SPECS = [
  { label: "Swagger Petstore", url: "https://petstore.swagger.io/", icon: "pets" },
  { label: "Fake REST API", url: "https://fakerestapi.azurewebsites.net/index.html", icon: "api" },
];

export default function RoastHero({ onSelectDemo }: RoastHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroMesh} aria-hidden />
      <div className={styles.gridSubtle} aria-hidden />

      <div className={styles.inner}>
        <h1 className={styles.headline}>
          <span className={styles.titleLine}>SHIP IT.</span>
          <span className={styles.coralGradient}>WE&apos;LL  JUDGE IT.</span>
        </h1>

        <p className={styles.subhead}>
          Paste your OpenAPI spec. We&apos;ll find the issues your API thought nobody would notice.
        </p>

        <div className={styles.demoContainer}>
          <span className={styles.demoLabel}>Try a sample API:</span>
          <div className={styles.demoBtns}>
            {DEMO_SPECS.map((demo) => (
              <button
                key={demo.label}
                type="button"
                className={styles.demoBtn}
                onClick={() => onSelectDemo(demo.url)}
              >
                <MaterialIcon name={demo.icon} size="xs" />
                <span>{demo.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
