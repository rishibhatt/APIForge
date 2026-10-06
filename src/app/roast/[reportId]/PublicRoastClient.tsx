"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import RoastReport from "@/components/roast/RoastReport";
import shared from "@/components/roast/RoastSection.module.css";
import type { SanitizedRoastReport } from "@/lib/roast/types";
import { useLanguage } from "@/hooks/useLanguage";
import styles from "@/app/roast-my-api/RoastPage.module.css";

export default function PublicRoastClient({ reportId }: { reportId: string }) {
  const { t } = useLanguage();
  const [report, setReport] = useState<SanitizedRoastReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchReport() {
      try {
        const res = await fetch(`/api/roast/${reportId}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Report not found");
        if (!cancelled) setReport(data.report);
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchReport();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  return (
    <div className={`${styles.pageShell} roastZone`}>
      <LandingHeader t={t} minimal />

      <main className={styles.mainContent}>
        {loading ? (
          <div className={styles.state} role="status">
            <p className={styles.stateText}>Loading the roast report…</p>
          </div>
        ) : missing || !report ? (
          <div className={styles.state}>
            <h1 className={styles.stateTitle}>This roast has gone cold</h1>
            <p className={styles.stateText}>
              Shared reports are kept for a limited time, and this one has expired or the link is wrong. Run
              the spec again to get a fresh report and a new link.
            </p>
            <Link href="/roast-my-api" className={shared.btn}>
              Roast an API
            </Link>
          </div>
        ) : (
          <RoastReport report={report} isPublic />
        )}
      </main>

      <LandingFooter t={t} />
    </div>
  );
}
