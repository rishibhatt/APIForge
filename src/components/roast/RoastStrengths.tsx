import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { RoastStrength } from "@/lib/roast/types";
import { sentenceCase } from "./labels";
import shared from "./RoastSection.module.css";
import styles from "./RoastStrengths.module.css";

export interface RoastStrengthsProps {
  strengths: RoastStrength[];
}

export default function RoastStrengths({ strengths }: RoastStrengthsProps) {
  return (
    <section id="strengths" className={shared.section} aria-labelledby="strengths-title">
      <div className={shared.head} data-reveal>
        <h2 id="strengths-title" className={shared.title}>
          What held up
        </h2>
        <p className={shared.lede}>Not everything was a crime.</p>
      </div>

      {strengths.length > 0 ? (
        <ul className={styles.list} data-reveal-group>
          {strengths.map((s) => (
            <li key={s.ruleId ?? s.title} className={styles.item} data-reveal-item>
              <MaterialIcon name="check_circle" size="sm" className={styles.icon} />
              <div>
                <h3 className={styles.title}>{sentenceCase(s.title)}</h3>
                <p className={styles.desc}>{s.description}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          Nothing made it through clean this time. The auto-fix preview below is the fastest way to change
          that.
        </p>
      )}
    </section>
  );
}
