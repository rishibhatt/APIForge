"use client";

import { useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { RoastOffence } from "@/lib/roast/presentationAdapter";
import styles from "./RoastOffences.module.css";

export interface RoastOffencesProps {
  offences: RoastOffence[];
}

export default function RoastOffences({ offences }: RoastOffencesProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedRanks, setExpandedRanks] = useState<Record<number, boolean>>({});
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  if (offences.length === 0) return null;

  const visibleOffences = showAll ? offences : offences.slice(0, 3);
  const hasMore = offences.length > 3;

  const toggleExpand = (rank: number) => {
    setExpandedRanks((prev) => ({
      ...prev,
      [rank]: !prev[rank],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const renderSeverityDots = (severity: string) => {
    let filled = 2;
    if (severity === "critical") filled = 4;
    else if (severity === "high") filled = 3;
    else if (severity === "low") filled = 1;

    return (
      <div className={styles.severityWrap} title={`Severity: ${severity}`}>
        <span className={styles.severityText}>{severity.toUpperCase()}</span>
        <div className={styles.dotsRow}>
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`${styles.dot} ${i <= filled ? styles.dotFilled : styles.dotEmpty}`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerTitleRow}>
          <MaterialIcon name="gavel" className={styles.gavelIcon} />
          <h3 className={styles.sectionTitle}>THE BIGGEST OFFENCES</h3>
        </div>
        <p className={styles.sectionSub}>&quot;Your API&apos;s greatest hits.&quot;</p>
      </div>

      <div className={styles.stack}>
        {visibleOffences.map((offence) => {
          const isExpanded = !!expandedRanks[offence.rank];

          return (
            <article key={offence.rank} className={styles.card}>
              {/* Layer 1: Identity & Severity */}
              <div className={styles.cardHeader}>
                <div className={styles.rankBadge}>
                  <span className={styles.rankNum}>
                    {String(offence.rank).padStart(2, "0")}
                  </span>
                  <span className={styles.categoryTitle}>{offence.title}</span>
                </div>

                {renderSeverityDots(offence.severity)}
              </div>

              {/* Layer 2: Impact */}
              <div className={styles.impactRow}>
                <span className={styles.countBadge}>
                  <MaterialIcon name="bug_report" size="sm" />
                  {offence.count} {offence.count === 1 ? "finding" : "findings"}
                </span>
                <span className={styles.bulletDot}>•</span>
                <span className={styles.affectedPercentage}>
                  {offence.affectedPercentage}% affected
                </span>
              </div>

              {/* Layer 3: Human Explanation */}
              <p className={styles.funnyQuote}>&quot;{offence.funnySummary}&quot;</p>

              {/* Collapsible Receipts Trigger */}
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => toggleExpand(offence.rank)}
                aria-expanded={isExpanded}
              >
                <span>{isExpanded ? "Hide receipts" : "Show the receipts"}</span>
                <MaterialIcon
                  name={isExpanded ? "expand_less" : "expand_more"}
                  size="sm"
                />
              </button>

              {/* Layer 4: Technical Detail (Collapsible) */}
              {isExpanded ? (
                <div className={styles.receiptsBox}>
                  {/* Why it matters */}
                  <div className={styles.detailBlock}>
                    <h5 className={styles.detailLabel}>WHY SHOULD I CARE?</h5>
                    <p className={styles.detailText}>{offence.whyItMatters}</p>
                  </div>

                  {/* Explanation */}
                  <div className={styles.detailBlock}>
                    <h5 className={styles.detailLabel}>WHAT WAS DETECTED</h5>
                    <p className={styles.detailText}>{offence.explanation}</p>
                  </div>

                  {/* Endpoints */}
                  {offence.endpoints.length > 0 ? (
                    <div className={styles.detailBlock}>
                      <h5 className={styles.detailLabel}>AFFECTED ENDPOINTS</h5>
                      <div className={styles.endpointList}>
                        {offence.endpoints.map((ep) => {
                          const fullEpStr = `${ep.method} ${ep.path}`;
                          const isCopied = copiedPath === fullEpStr;

                          return (
                            <div key={fullEpStr} className={styles.endpointRow}>
                              <div className={styles.endpointLeft}>
                                <span
                                  className={`${styles.methodBadge} ${
                                    styles[`method_${ep.method.toLowerCase()}`] || ""
                                  }`}
                                >
                                  {ep.method}
                                </span>
                                <span className={styles.pathText}>{ep.path}</span>
                              </div>

                              <button
                                type="button"
                                className={styles.copyBtn}
                                onClick={() => copyToClipboard(fullEpStr)}
                                title="Copy endpoint string"
                              >
                                <MaterialIcon
                                  name={isCopied ? "check" : "content_copy"}
                                  size="sm"
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* Suggested Fix */}
                  <div className={styles.detailBlock}>
                    <h5 className={styles.detailLabel}>SUGGESTED DIRECTION</h5>
                    <p className={styles.suggestionText}>{offence.suggestedFix}</p>
                  </div>

                  {/* Rule ID Metadata */}
                  <div className={styles.ruleIdRow}>
                    <span className={styles.ruleTag}>Rule: {offence.ruleId}</span>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {hasMore ? (
        <div className={styles.showMoreRow}>
          <button
            type="button"
            className={styles.showMoreBtn}
            onClick={() => setShowAll(!showAll)}
          >
            <MaterialIcon name={showAll ? "unfold_less" : "unfold_more"} size="sm" />
            <span>
              {showAll
                ? "Show top 3 offences"
                : `+ Show all ${offences.length} issue categories`}
            </span>
          </button>
        </div>
      ) : null}
    </section>
  );
}
