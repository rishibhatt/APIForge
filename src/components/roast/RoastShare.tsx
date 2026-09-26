"use client";

import { useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import AppLogo from "@/components/atomic/atoms/AppLogo/AppLogo";
import type { SanitizedRoastReport } from "@/lib/roast/types";
import styles from "./RoastShare.module.css";

export interface RoastShareProps {
  report: SanitizedRoastReport;
  onClose: () => void;
}

type ShareTab = "meme" | "card" | "badge";

interface MemeTemplate {
  id: string;
  name: string;
  icon: string;
  caption: string;
}

const MEME_TEMPLATES: MemeTemplate[] = [
  {
    id: "dev-who-wrote",
    name: "Dev Review",
    icon: "code",
    caption: "The developer reviewing this API diff at 2 AM",
  },
  {
    id: "http-police",
    name: "HTTP Semantics",
    icon: "report_problem",
    caption: "HTTP specification guidelines have entered the chat.",
  },
  {
    id: "no-docs",
    name: "Documentation",
    icon: "description",
    caption: "Documentation.exe has stopped responding.",
  },
  {
    id: "404-conventions",
    name: "REST Standards",
    icon: "find_in_page",
    caption: "404: REST conventions not found.",
  },
  {
    id: "everything-fine",
    name: "Status 200",
    icon: "check_circle",
    caption: "API is on fire, but the response code is 200 OK.",
  },
];

export default function RoastShare({ report, onClose }: RoastShareProps) {
  const [tab, setTab] = useState<ShareTab>("meme");
  const [selectedMeme, setSelectedMeme] = useState<MemeTemplate>(MEME_TEMPLATES[0]!);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const reportUrl = typeof window !== "undefined"
    ? `${window.location.origin}/roast/${report.id}`
    : `https://apiforge.info/roast/${report.id}`;

  const badgeUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/roast/badge/${report.id}`
    : `https://apiforge.info/api/roast/badge/${report.id}`;

  const embedCode = `<a href="${reportUrl}"><img src="${badgeUrl}" alt="APIForge Quality Badge" /></a>`;

  const shareTextX = `I let APIForge judge my API.\n\nScore: ${report.score}/100 — ${report.summary.statusTier}\n\n"${report.summary.verdict}"\n\nRoast yours: ${reportUrl}`;

  const shareTextLinkedIn = `I ran our API specification through APIForge's "Roast My API" quality engine.\n\nScore: ${report.score}/100 (${report.summary.statusTier})\nVerdict: "${report.summary.verdict}"\nEndpoints analyzed: ${report.endpointsCount}\n\nCheck out the full report: ${reportUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareX = () => {
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextX)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  };

  const handleShareLinkedIn = () => {
    const intent = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(reportUrl)}&summary=${encodeURIComponent(shareTextLinkedIn)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  };

  const handleDownloadImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dark Background
    ctx.fillStyle = "#0B0B0D";
    ctx.fillRect(0, 0, 1200, 630);

    // Coral Accent Gradient Border
    const grad = ctx.createLinearGradient(0, 0, 1200, 630);
    grad.addColorStop(0, "#FF6B4A");
    grad.addColorStop(1, "#8B5CF6");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 1190, 620);

    // Header
    ctx.fillStyle = "#FF6B4A";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("APIFORGE ROAST", 60, 80);

    // Score Badge
    ctx.fillStyle = "#121216";
    ctx.fillRect(960, 45, 180, 55);
    ctx.fillStyle = "#FF6B4A";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(`${report.score} / 100`, 985, 82);

    // Verdict Quote
    ctx.fillStyle = "#F5F3F7";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(`"${report.summary.verdict}"`, 60, 180);

    // Main Roast Text
    ctx.fillStyle = "#96939D";
    ctx.font = "24px sans-serif";
    const roastLines = report.summary.roast.match(/.{1,75}(\s|$)/g) || [report.summary.roast];
    let y = 260;
    for (const line of roastLines.slice(0, 4)) {
      ctx.fillText(line.trim(), 60, y);
      y += 38;
    }

    // Bottom Stats
    ctx.fillStyle = "#71717A";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(
      `${report.endpointsCount} endpoints • ${report.summary.totalFindings} issues • #${report.summary.statusTier}`,
      60,
      560,
    );

    // Trigger download
    const link = document.createElement("a");
    link.download = `apiforge-roast-${report.score}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Create Your Roast Share Card">
        <div className={styles.header}>
          <h3 className={styles.title}>
            <span style={{ color: "#ff6b4a" }}>
              <MaterialIcon name="local_fire_department" />
            </span>
            <span>YOUR API GOT ROASTED. NOW MAKE IT EVERYONE&apos;S PROBLEM.</span>
          </h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <MaterialIcon name="close" size="sm" />
          </button>
        </div>

        <div className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === "meme" ? styles.tabActive : ""}`}
            onClick={() => setTab("meme")}
          >
            Meme Card
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${tab === "card" ? styles.tabActive : ""}`}
            onClick={() => setTab("card")}
          >
            Roast Card
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${tab === "badge" ? styles.tabActive : ""}`}
            onClick={() => setTab("badge")}
          >
            Technical Badge
          </button>
        </div>

        {tab === "meme" ? (
          <div className={styles.templateGrid}>
            {MEME_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                className={`${styles.templateCard} ${
                  selectedMeme.id === tmpl.id ? styles.templateActive : ""
                }`}
                onClick={() => setSelectedMeme(tmpl)}
              >
                <div><MaterialIcon name={tmpl.icon} size="sm" /></div>
                <div>{tmpl.name}</div>
              </button>
            ))}
          </div>
        ) : null}

        {tab !== "badge" ? (
          <div className={styles.shareCardCanvas}>
            <div className={styles.cardTopRow}>
              <div className={styles.brandWrap}>
                <AppLogo size={28} />
                <span className={styles.brandLogo}>APIFORGE</span>
                <span className={styles.brandSub}>ROAST</span>
              </div>
              <span className={styles.scoreBadge}>{report.score} / 100</span>
            </div>

            <h4 className={styles.mainRoastQuote}>
              &quot;{report.summary.verdict}&quot;
            </h4>

            {tab === "meme" ? (
              <div className={styles.memeBox}>
                <span className={styles.memeEmoji}><MaterialIcon name={selectedMeme.icon} size="sm" /></span>
                <span className={styles.memeText}>{selectedMeme.caption}</span>
              </div>
            ) : (
              <div className={styles.memeBox}>
                <span className={styles.memeEmoji}><MaterialIcon name="code" size="sm" /></span>
                <span className={styles.memeText}>
                  {report.summary.topPatterns[0]?.technicalExplanation || report.summary.roast.slice(0, 100)}
                </span>
              </div>
            )}

            <div className={styles.cardMetricsRow}>
              <span>
                {report.endpointsCount} endpoints • {report.summary.totalFindings} issues • {report.summary.topPatterns.length} patterns
              </span>
              <span className={styles.hashtag}>#RoastMyAPI #APIForge</span>
            </div>
          </div>
        ) : (
          <div className={styles.shareCardCanvas} style={{ textAlign: "center" }}>
            <span className={styles.label}>Live SVG Quality Badge</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badgeUrl} alt="APIForge Quality Badge" style={{ margin: "1rem auto", display: "block" }} />
          </div>
        )}

        <div className={styles.gridBtns}>
          <button type="button" className={`${styles.shareOptionBtn} ${styles.primaryShareBtn}`} onClick={handleShareX}>
            <span>Share on X</span>
          </button>

          <button type="button" className={styles.shareOptionBtn} onClick={handleShareLinkedIn}>
            <span>Share on LinkedIn</span>
          </button>

          <button type="button" className={styles.shareOptionBtn} onClick={handleDownloadImage}>
            <MaterialIcon name="download" size="sm" />
            <span>DOWNLOAD IMAGE (PNG)</span>
          </button>

          <button type="button" className={styles.shareOptionBtn} onClick={handleCopyLink}>
            <MaterialIcon name={copiedLink ? "check" : "link"} size="sm" />
            <span>{copiedLink ? "LINK COPIED!" : "COPY PUBLIC LINK"}</span>
          </button>
        </div>

        <div className={styles.badgeEmbedBox}>
          <label className={styles.label}>Embed Quality Badge (HTML)</label>
          <textarea
            className={styles.codeArea}
            rows={2}
            readOnly
            value={embedCode}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <button
            type="button"
            className={styles.shareOptionBtn}
            style={{ marginTop: "0.5rem", width: "100%" }}
            onClick={handleCopyEmbed}
          >
            <MaterialIcon name={copiedEmbed ? "check" : "code"} size="sm" />
            <span>{copiedEmbed ? "EMBED CODE COPIED!" : "COPY EMBED CODE"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
