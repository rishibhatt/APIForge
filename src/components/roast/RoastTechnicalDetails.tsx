import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { RoastSummary } from "@/lib/roast/types";
import { CATEGORY_MAX, categoryLabel } from "./labels";
import shared from "./RoastSection.module.css";
import styles from "./RoastTechnicalDetails.module.css";

export interface RoastTechnicalDetailsProps {
  summary: RoastSummary;
  breakdown: Record<string, number>;
  suggestions?: string[];
}

function formatPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function RoastTechnicalDetails({ summary, breakdown, suggestions = [] }: RoastTechnicalDetailsProps) {
  const rows = Object.entries(breakdown);

  return (
    <section id="details" className={shared.section} aria-labelledby="details-title">
      <div className={shared.head} data-reveal>
        <h2 id="details-title" className={shared.title}>
          Technical details
        </h2>
        <p className={shared.lede}>The numbers behind the jokes.</p>
      </div>

      <h3 className={styles.subhead}>Score by category</h3>
      <div className={styles.tableWrap} data-reveal>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className={styles.num}>
                Points
              </th>
              <th scope="col" className={styles.barCol}>
                <span className={styles.srOnly}>Share of available points</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, points]) => {
              const max = CATEGORY_MAX[key];
              const ratio = max ? Math.min(1, points / max) : 0;
              const tone = ratio >= 0.85 ? shared.ok : ratio >= 0.6 ? shared.warn : shared.bad;
              return (
                <tr key={key}>
                  <th scope="row">{categoryLabel(key)}</th>
                  <td className={styles.num}>
                    {formatPoints(points)}
                    {max ? <span className={styles.max}> / {max}</span> : null}
                  </td>
                  <td className={styles.barCol}>
                    {max ? (
                      <div className={shared.meter} aria-hidden>
                        <div
                          className={`${shared.meterFill} ${tone}`}
                          data-grow={ratio}
                          style={{ transform: `scaleX(${ratio})` }}
                        />
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {suggestions.length > 0 ? (
        <>
          <h3 className={styles.subhead}>Recommendations</h3>
          <ul className={styles.recs} data-reveal-group>
            {suggestions.map((s) => (
              <li key={s} data-reveal-item>
                <MaterialIcon name="arrow_right_alt" size="sm" className={styles.recIcon} />
                {s}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {summary.topPatterns.length > 0 ? (
        <details className={styles.evidence}>
          <summary>
            <MaterialIcon name="chevron_right" size="sm" className={styles.chevron} />
            Rule evidence ({summary.topPatterns.length} rules)
          </summary>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Rule</th>
                  <th scope="col">Category</th>
                  <th scope="col" className={styles.num}>
                    Hits
                  </th>
                  <th scope="col">Example</th>
                </tr>
              </thead>
              <tbody>
                {summary.topPatterns.map((p) => (
                  <tr key={p.ruleId}>
                    <th scope="row">
                      <code>{p.ruleId}</code>
                    </th>
                    <td>{categoryLabel(p.category)}</td>
                    <td className={styles.num}>{p.count}</td>
                    <td className={styles.example}>{p.technicalExplanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}
