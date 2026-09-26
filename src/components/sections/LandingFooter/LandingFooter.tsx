"use client";

import Link from "next/link";
import type { TranslateFn } from "@/context/LanguageContext";
import styles from "./LandingFooter.module.css";

const LINKEDIN_HREF = "https://www.linkedin.com/in/rishab-bhatt-7ba7111ab/";
const X_HREF = "https://x.com/Rishi_o07";
const GITHUB_REPO_HREF = "https://github.com/rishibhatt/APIForge";
const GITHUB_PROFILE_HREF = "https://github.com/rishibhatt";

export interface LandingFooterProps {
  t?: TranslateFn;
}

export default function LandingFooter({}: LandingFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footerWrap}>
      <div className={styles.footerInner}>
        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <h4 className={styles.colTitle}>Product & Tools</h4>
            <ul className={styles.linkList}>
              <li><Link className={styles.link} href="/api-score">API Quality Score</Link></li>
              <li><Link className={styles.link} href="/openapi-validator">OpenAPI Validator</Link></li>
              <li><Link className={styles.link} href="/swagger-validator">Swagger Validator</Link></li>
              <li><Link className={styles.link} href="/api-quality-checker">API Quality Checker</Link></li>
              <li><Link className={styles.link} href="/api-testing">API Testing Workbench</Link></li>
              <li><Link className={styles.link} href="/roast-my-api">🔥 Roast My API</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4 className={styles.colTitle}>Guides & Articles</h4>
            <ul className={styles.linkList}>
              <li><Link className={styles.link} href="/guides/openapi-best-practices">OpenAPI Best Practices</Link></li>
              <li><Link className={styles.link} href="/guides/rest-api-design-best-practices">REST API Design Guide</Link></li>
              <li><Link className={styles.link} href="/guides/swagger-vs-openapi">Swagger vs OpenAPI</Link></li>
              <li><Link className={styles.link} href="/guides/rest-api-error-handling">API Error Handling</Link></li>
              <li><Link className={styles.link} href="/guides">All 15+ Guides →</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4 className={styles.colTitle}>Resources & Specs</h4>
            <ul className={styles.linkList}>
              <li><Link className={styles.link} href="/glossary">API Glossary</Link></li>
              <li><Link className={styles.link} href="/examples">OpenAPI Examples</Link></li>
              <li><Link className={styles.link} href="/compare">Tool Comparisons</Link></li>
              <li><Link className={styles.link} href="/about">About APIForge</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4 className={styles.colTitle}>Connect & Code</h4>
            <ul className={styles.linkList}>
              <li><a className={styles.link} href={GITHUB_REPO_HREF} target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
              <li><a className={styles.link} href={GITHUB_PROFILE_HREF} target="_blank" rel="noopener noreferrer">Developer GitHub</a></li>
              <li><a className={styles.link} href={LINKEDIN_HREF} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a className={styles.link} href={X_HREF} target="_blank" rel="noopener noreferrer">X (Twitter)</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.line}>
          <span>© {year} APIForge. Built with passion for developer experience.</span>
          <span>
            Crafted by{" "}
            <a className={styles.link} href={GITHUB_PROFILE_HREF} target="_blank" rel="noopener noreferrer">
              Rishab Bhatt
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
