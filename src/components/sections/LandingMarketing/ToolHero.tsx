import type { ReactNode } from "react";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import ToolSpecForm from "./ToolSpecForm";
import styles from "./ToolHero.module.css";

/*
 * Hero for the tool landing pages (/api-score, /openapi-validator, ...).
 * Server component; the URL field is the shared client ToolSpecForm. Elements tagged data-hero /
 * data-pop / data-demo are animated on load by ProductMotion; all are visible without JS.
 */

export interface ToolHeroProps {
  /** Current page, for the breadcrumb trail. */
  crumb: { label: string; href: string };
  title: ReactNode;
  lede: ReactNode;
  /** Submit label; names what happens next. */
  cta?: string;
  /** Mono facts under the form, e.g. "OpenAPI 3.x". Keep them true. */
  facts?: string[];
  /** A static panel recreation from ./Demos. */
  aside?: ReactNode;
  inputId: string;
}

export default function ToolHero({
  crumb,
  title,
  lede,
  cta = "Open workspace",
  facts = [],
  aside,
  inputId,
}: ToolHeroProps) {
  return (
    <section className={styles.hero} aria-labelledby={`${inputId}-title`}>
      <div className={`gridBackdrop ${styles.grid}`} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.copy}>
          <div data-hero>
            <Breadcrumbs items={[crumb]} />
          </div>
          <h1 id={`${inputId}-title`} className={styles.title} data-hero>
            {title}
          </h1>
          <p className={styles.lede} data-hero>
            {lede}
          </p>

          <div data-hero>
            <ToolSpecForm id={inputId} cta={cta} />
          </div>

          {facts.length > 0 ? (
            <ul className={styles.facts}>
              {facts.map((f) => (
                <li key={f} data-pop>
                  {f}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {aside ? (
          <div className={styles.aside} data-demo>
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}
