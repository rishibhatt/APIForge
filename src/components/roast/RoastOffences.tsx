"use client";
import { useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { RoastOffence } from "@/lib/roast/presentationAdapter";
import { SEVERITY_LABELS, categoryLabel, severityTone } from "./labels";
import shared from "./RoastSection.module.css";
import styles from "./RoastOffences.module.css";

export interface RoastOffencesProps {
  offences: RoastOffence[];
}

const VISIBLE = 3;

/** "POST /pet: No 2xx response is documented." -> "No 2xx response is documented." */
function headline(explanation: string): string {
  const stripped = explanation.replace(/^[A-Z]+\s+\S+:\s*/, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export default function RoastOffences({ offences }: RoastOffencesProps) {
  const [showAll, setShowAll] = useState(false);

  if (offences.length === 0) return null;

  const visible = showAll ? offences : offences.slice(0, VISIBLE);
  const hidden = offences.length - VISIBLE;

  return (
    <section id="offences" className={shared.section} aria-labelledby="offences-title">
      <div className={shared.head} data-reveal>
        <h2 id="offences-title" className={shared.title}>
          Worst offences
        </h2>
        <p className={shared.lede}>Ranked by how much they cost you, with the routes that commit them.</p>
      </div>

      <ol className={styles.list} data-reveal-group>
        {visible.map((o) => {
          const tone = severityTone(o.severity);
          return (
            <li key={`${o.ruleId}-${o.rank}`} className={styles.item} data-reveal-item>
              <span className={styles.rank} aria-hidden>
                {o.rank}
              </span>

              <div className={styles.main}>
                <div className={styles.top}>
                  <h3 className={styles.title}>{headline(o.explanation)}</h3>
                  <span className={`${shared.pill} ${shared[tone]}`}>{SEVERITY_LABELS[o.severity]}</span>
                </div>

                <p className={styles.meta}>
                  {categoryLabel(o.category)}
                  <span aria-hidden>·</span>
                  <span>
                    {o.count} {o.count === 1 ? "finding" : "findings"}
                  </span>
                  <span aria-hidden>·</span>
                  {o.affectedPercentage}% of routes
                </p>

                <p className={styles.quip}>{o.funnySummary}</p>

                {o.endpoints.length > 0 ? (
                  <ul className={styles.routes} aria-label="Example routes">
                    {o.endpoints.map((ep) => (
                      <li key={`${ep.method} ${ep.path}`} className={styles.route}>
                        <span className={`${shared.method} ${shared[`method_${ep.method.toLowerCase()}`] ?? ""}`}>
                          {ep.method}
                        </span>
                        <span className={shared.path}>{ep.path}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.specWide}>Applies to the spec as a whole.</p>
                )}

                <dl className={styles.detail}>
                  <div>
                    <dt>Why it matters</dt>
                    <dd>{o.whyItMatters}</dd>
                  </div>
                  <div>
                    <dt>Fix</dt>
                    <dd>{o.suggestedFix}</dd>
                  </div>
                </dl>

                <p className={styles.rule}>
                  Rule <code>{o.ruleId}</code>
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {hidden > 0 ? (
        <button
          type="button"
          className={`${shared.btnSecondary} ${styles.more}`}
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
        >
          <MaterialIcon name={showAll ? "expand_less" : "expand_more"} size="sm" />
          {showAll ? "Show the top 3 only" : `Show ${hidden} more`}
        </button>
      ) : null}
    </section>
  );
}
