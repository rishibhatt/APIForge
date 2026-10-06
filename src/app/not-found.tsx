import type { Metadata } from "next";
import Link from "next/link";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import btn from "@/components/atomic/atoms/Button/Button.module.css";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const ISSUES_HREF = "https://github.com/rishibhatt/APIForge/issues/new";

const DESTINATIONS = [
  { href: "/api-score", label: "API quality score", hint: "Grade a spec 0–100" },
  { href: "/openapi-validator", label: "OpenAPI validator", hint: "Parse and inspect a spec" },
  { href: "/guides", label: "Guides", hint: "OpenAPI and REST design" },
  { href: "/roast-my-api", label: "Roast my API", hint: "A shareable, honest review" },
] as const;

export default function NotFound() {
  return (
    <div className={styles.page}>
      <LandingHeader minimal />
      <main className={styles.main}>
        <div className={`gridBackdrop ${styles.grid}`} aria-hidden />
        <div className={styles.inner}>
          <h1 className={styles.title}>This page doesn&apos;t exist</h1>
          <p className={styles.status}>
            <span className={styles.code}>404</span>
            <span>Not found</span>
          </p>
          <p className={styles.lede}>
            The link may be out of date, or the address has a typo. If you were opening a spec,
            paste its URL below and the workspace will load it.
          </p>

          <form className={styles.form} action="/" method="get">
            <MaterialIcon name="link" size="sm" className={styles.formIcon} />
            <label htmlFor="not-found-spec" className="srOnly">
              OpenAPI or Swagger URL
            </label>
            <input
              id="not-found-spec"
              className={styles.input}
              type="url"
              name="spec"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              required
              pattern="https?://.+"
              title="A URL starting with http:// or https://"
              placeholder="https://api.example.com/openapi.json"
            />
            <button type="submit" className={styles.submit}>
              Open workspace
              <MaterialIcon name="arrow_forward" size="sm" />
            </button>
          </form>

          <div className={styles.actions}>
            <Link href="/" className={`${btn.btn} ${btn.secondary} ${btn.md}`}>
              <MaterialIcon name="arrow_back" size="xs" />
              Back to the homepage
            </Link>
            <a
              href={ISSUES_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn.btn} ${btn.ghost} ${btn.md}`}
            >
              Report a broken link
            </a>
          </div>

          <nav className={styles.destinations} aria-label="Popular pages">
            <h2 className="monoLabel">Popular pages</h2>
            <ul>
              {DESTINATIONS.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className={styles.destination}>
                    <span className={styles.destLabel}>{d.label}</span>
                    <span className={styles.destHint}>{d.hint}</span>
                    <MaterialIcon name="chevron_right" size="xs" className={styles.destIcon} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
