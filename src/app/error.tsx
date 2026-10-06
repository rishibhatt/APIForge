"use client";

import { useEffect } from "react";
import Link from "next/link";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import btn from "@/components/atomic/atoms/Button/Button.module.css";
import styles from "./not-found.module.css";

const ISSUES_HREF = "https://github.com/rishibhatt/APIForge/issues/new";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.page}>
      <LandingHeader minimal />
      <main className={styles.main}>
        <div className={`gridBackdrop ${styles.grid}`} aria-hidden />
        <div className={styles.inner}>
          <h1 className={styles.title}>Something broke on this page</h1>
          <p className={`${styles.status} ${styles.statusError}`}>
            <MaterialIcon name="error" size="xs" />
            <span>Unexpected error</span>
          </p>
          <p className={styles.lede}>
            APIForge hit an error it didn&apos;t expect. Trying again usually works. If you had a
            spec open and it doesn&apos;t come back, reopen it from the homepage.
          </p>

          <div className={styles.actions}>
            <button type="button" onClick={reset} className={`${btn.btn} ${btn.primary} ${btn.md}`}>
              <MaterialIcon name="refresh" size="xs" />
              Try again
            </button>
            <Link href="/" className={`${btn.btn} ${btn.secondary} ${btn.md}`}>
              Back to the homepage
            </Link>
            <a
              href={ISSUES_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn.btn} ${btn.ghost} ${btn.md}`}
            >
              Report the problem
            </a>
          </div>

          {error.digest ? (
            <p className={styles.digest}>
              <span className="monoLabel">Error ID</span>
              <code>{error.digest}</code>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
