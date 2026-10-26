import Link from "next/link";
import Image from "next/image";
import type { TranslateFn } from "@/context/LanguageContext";
import AppLogo from "@/components/atomic/atoms/AppLogo/AppLogo";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { ROAST_LOGO_PATH } from "@/constants/assets";
import styles from "./LandingFooter.module.css";

const LINKEDIN_HREF = "https://www.linkedin.com/in/rishab-bhatt-7ba7111ab/";
const X_HREF = "https://x.com/Rishi_o07";
const GITHUB_REPO_HREF = "https://github.com/rishibhatt/APIForge";

export interface LandingFooterProps {
  t?: TranslateFn;
}

type FooterLink = { href: string; label: string; external?: boolean; roast?: boolean };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/#parse-api", label: "Workspace" },
      { href: "/api-score", label: "API quality score" },
      { href: "/api-quality-checker", label: "API quality checker" },
      { href: "/openapi-validator", label: "OpenAPI validator" },
      { href: "/swagger-validator", label: "Swagger validator" },
      { href: "/api-testing", label: "API testing" },
      { href: "/roast-my-api", label: "Roast my API", roast: true },
    ],
  },
  {
    title: "Guides",
    links: [
      { href: "/guides/openapi-best-practices", label: "OpenAPI best practices" },
      { href: "/guides/rest-api-design-best-practices", label: "REST API design" },
      { href: "/guides/rest-api-error-handling", label: "Error handling" },
      { href: "/guides/swagger-vs-openapi", label: "Swagger vs OpenAPI" },
      { href: "/guides", label: "All guides" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/glossary", label: "Glossary" },
      { href: "/examples", label: "OpenAPI examples" },
      { href: "/checklists", label: "Checklists" },
      { href: "/compare", label: "Comparisons" },
      { href: "/reference", label: "Reference" },
      { href: "/about", label: "About" },
      { href: "/support", label: "Support" },
    ],
  },
  {
    title: "Connect",
    links: [
      { href: GITHUB_REPO_HREF, label: "Source on GitHub", external: true },
      { href: LINKEDIN_HREF, label: "LinkedIn", external: true },
      { href: X_HREF, label: "X", external: true },
    ],
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function LandingFooter(_props: LandingFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link href="/" className={styles.brand} aria-label="APIForge home">
            <AppLogo size={24} maxWidth={24} className={styles.violetMark} />
            <span className={styles.fireMark} aria-hidden>
              <Image
                src={ROAST_LOGO_PATH}
                alt=""
                width={24}
                height={24}
                className={styles.fireMarkLogo}
              />
            </span>
            <span>APIForge</span>
          </Link>
          <p className={styles.tagline}>
            Parse, run, score, and generate from any OpenAPI or Swagger spec, in one browser tab.
          </p>
        </div>

        <nav className={styles.columns} aria-label="Footer">
          {COLUMNS.map((col) => (
            <div key={col.title} className={styles.col}>
              <h2 className={styles.colTitle}>{col.title}</h2>
              <ul className={styles.links}>
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a className={styles.link} href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.label}
                        <MaterialIcon name="open_in_new" size="xs" className={styles.extIcon} />
                      </a>
                    ) : (
                      <Link className={`${styles.link} ${l.roast ? styles.roastLink : ""}`} href={l.href}>
                        {l.roast ? (
                          <span className={styles.fireEmoji} aria-hidden>
                            🔥
                          </span>
                        ) : null}
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={styles.baseline}>
        <span className={styles.legal}>
          © {year} APIForge
        </span>
        <span className={styles.author}>
          <Image
            src="/images/RishabPFP.png"
            alt=""
            width={24}
            height={24}
            className={styles.avatar}
          />
          <span>
            Built by <strong>Rishab Bhatt</strong>
          </span>
        </span>
      </div>
    </footer>
  );
}
