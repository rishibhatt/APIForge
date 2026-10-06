"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import type { SanitizedRoastReport } from "@/lib/roast/types";
import { ROAST_LOGO_PATH } from "@/constants/assets";
import { toast } from "@/components/providers/Toaster/toast";
import { TIER_LABELS } from "./labels";

const FALLBACK_ORIGIN = "https://apiforge.info";

export type CopyKey = "link" | "markdown" | "html" | "url" | "post" | "challenge";
export type ShareTone = "roast" | "brag" | "dev";

export const SHARE_TONES: { id: ShareTone; label: string }[] = [
  { id: "roast", label: "Roast me" },
  { id: "brag", label: "Humble brag" },
  { id: "dev", label: "Dev to dev" },
];

/** X counts every URL as 23 characters, whatever its real length. */
export const X_URL_LENGTH = 23;
export const X_LIMIT = 280;

/** Strip the backticks the roast copy uses for inline code. */
export function plainRoast(text: string): string {
  return text.replace(/`([^`]+)`/g, "$1");
}

function firstSentence(text: string, max = 150): string {
  const plain = plainRoast(text);
  const m = plain.match(/^.+?[.!?](\s|$)/);
  const s = (m ? m[0] : plain).trim();
  return s.length > max ? `${s.slice(0, max - 1).trim()}…` : s;
}

function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1).trim()}…` : t;
}

export interface DraftFacts {
  title: string;
  score: number;
  tier: string;
  verdict: string;
  findings: number;
  /** "POST /pet": the first representative endpoint of the top pattern, when there is one. */
  topPath?: string;
  /** One sentence naming the top pattern. */
  topIssue?: string;
}

/** The post body without the report URL (X takes the URL separately; other targets append it). */
export function buildPostDraft(tone: ShareTone, f: DraftFacts): string {
  const t = clip(f.title, 40);
  const n = `${f.findings} ${f.findings === 1 ? "finding" : "findings"}`;
  const verdict = clip(f.verdict.replace(/\s+/g, " "), 90);

  if (tone === "brag") {
    if (f.score >= 85) {
      return `🛡️ APIForge Badge: ${t} scored ${f.score}/100 on Roast My API (${f.tier}). ${n}${f.topPath ? `, and the worst of them is ${f.topPath}` : ""}. I'll take it.\n\nScore yours:`;
    }
    return `🛡️ APIForge Badge: Ran ${t} through Roast My API: ${f.score}/100, ${f.tier}. ${n}${f.topPath ? `, worst on ${f.topPath}` : ""}. Better to hear it from a bot than from a customer.\n\nScore yours:`;
  }

  if (tone === "dev") {
    const issue = f.topIssue ? ` Top pattern: ${clip(f.topIssue, 110)}` : "";
    return `🛡️ APIForge API Quality Score: Linted the ${t} spec: ${f.score}/100 (${f.tier}), ${n}.${issue}${f.topPath ? ` (${f.topPath})` : ""}\n\nWorth running yours before the next release. #APIForge #OpenAPI #APIDesign`;
  }

  return `🔥 APIForge Roast My API: Let a bot roast ${t}. ${f.score}/100, "${f.tier}".\n\n"${verdict}"\n\n${n}${f.topPath ? `, and ${f.topPath} is the one that hurts` : ""}. Roast yours:`;
}

/** Characters X will count for this draft: text, a space, and the 23-character URL. */
export function xLength(draft: string): number {
  return draft.length + 1 + X_URL_LENGTH;
}

function selectAll(el: HTMLElement | null) {
  if (!el) return;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
    el.select();
    return;
  }
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);
}

export interface CopyOptions {
  key?: CopyKey;
  /** Toast title on success. */
  title?: string;
  description?: string;
  /** On failure the text is selected in this element so the user can copy by hand. */
  fallback?: RefObject<HTMLElement | null>;
}

export function useRoastShare(report: SanitizedRoastReport) {
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN);
  const [copied, setCopied] = useState<CopyKey | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  const { summary } = report;
  const reportUrl = `${origin}/roast/${report.id}`;
  const roastUrl = `${origin}/roast-my-api`;
  const badgeUrl = `${origin}/api/roast/badge/${report.id}`;
  const markdown = `[![APIForge score](${badgeUrl})](${reportUrl})`;
  const html = `<a href="${reportUrl}"><img src="${badgeUrl}" alt="APIForge score" /></a>`;
  const tier = TIER_LABELS[summary.statusTier] ?? summary.statusTier;

  const top = summary.topPatterns?.[0];
  const facts: DraftFacts = {
    title: report.title,
    score: report.score,
    tier,
    verdict: summary.verdict,
    findings: summary.totalFindings,
    topPath: top?.representativeEndpoints?.[0],
    topIssue: top?.technicalExplanation ? firstSentence(top.technicalExplanation, 110) : undefined,
  };
  const draftFor = (tone: ShareTone) => buildPostDraft(tone, facts);

  // CONTRACT with the /roast-my-api entry page: `beat` is 0-100, `from` is the title (max 60 chars).
  const challengeUrl = `${origin}/roast-my-api?beat=${report.score}&from=${encodeURIComponent(report.title.slice(0, 60))}`;
  const challengeMessage = `I got ${report.score}/100 on Roast My API (${summary.verdict}). Beat it:`;
  const challengeText = `${challengeMessage} ${challengeUrl}`;

  const copy = useCallback(async (text: string, opts: CopyOptions = {}): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      selectAll(opts.fallback?.current ?? null);
      toast.error("Couldn't copy", {
        description: opts.fallback?.current
          ? "Your browser blocked the clipboard. The text is selected: press Ctrl+C (Cmd+C on Mac)."
          : "Your browser blocked the clipboard. Select the text and copy it by hand.",
        id: "roast-copy-error",
      });
      return false;
    }
    const key = opts.key;
    if (key) {
      setCopied(key);
      window.setTimeout(() => setCopied((k) => (k === key ? null : k)), 2000);
    }
    toast.success(opts.title ?? "Copied", { description: opts.description, id: `roast-copy-${key ?? "x"}` });
    return true;
  }, []);

  const shareX = useCallback(
    (text: string, url: string = reportUrl) => {
      const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(intent, "_blank", "noopener,noreferrer");
    },
    [reportUrl],
  );

  /**
   * LinkedIn can't prefill text through share-offsite, so the draft goes to the clipboard first
   * and the composer opens with the same text in the query (LinkedIn may ignore it).
   */
  const shareLinkedIn = useCallback(
    (text: string, fallback?: RefObject<HTMLElement | null>) => {
      const full = `🛡️ APIForge Badge & Report\n\n${text}\n\n${reportUrl}`;
      // Open synchronously so popup blockers see a user gesture; the clipboard write races it.
      window.open(
        `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(full)}`,
        "_blank",
        "noopener,noreferrer",
      );
      void copy(full, { key: "post", title: "Post copied for LinkedIn", description: "Paste it into your LinkedIn post.", fallback });
    },
    [copy, reportUrl],
  );

  /** Native share sheet; the caller shows the button only when `canNativeShare`. */
  const shareNative = useCallback(
    async (text: string): Promise<void> => {
      if (typeof navigator.share !== "function") return;
      try {
        await navigator.share({ title: `${report.title}: ${report.score}/100`, text, url: reportUrl });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error("Couldn't open the share sheet", { description: "Use Copy post instead." });
      }
    },
    [report.score, report.title, reportUrl],
  );

  /**
   * 1200x630 share card in the Roast look: ember dark ground, coral score, verdict headline,
   * the meme frame currently on screen (same-origin video, so the canvas stays untainted).
   */
  const downloadCard = useCallback(() => {
    const W = 1200;
    const H = 630;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const family = getComputedStyle(document.body).fontFamily || "ui-sans-serif, system-ui, sans-serif";
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "ui-monospace, monospace";

    const wrap = (text: string, maxWidth: number): string[] => {
      const lines: string[] = [];
      let line = "";
      for (const word of text.split(" ")) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    };

    const render = (logo?: HTMLImageElement) => {
      // Ground + ember glow + grid
      ctx.fillStyle = "#131315";
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(W * 0.72, -40, 20, W * 0.72, -40, 620);
      glow.addColorStop(0, "rgba(255,107,74,0.30)");
      glow.addColorStop(1, "rgba(255,107,74,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.035)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 44) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
        ctx.stroke();
      }

      // Meme frame on the right, if the clip has a decoded frame
      const video = document.querySelector<HTMLVideoElement>("video[data-roast-meme]");
      const mx = 712;
      const my = 112;
      const mw = 432;
      const mh = 432;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const vr = video.videoWidth / video.videoHeight;
        let sw = video.videoWidth;
        let sh = video.videoHeight;
        let sx = 0;
        let sy = 0;
        if (vr > 1) {
          sw = sh;
          sx = (video.videoWidth - sw) / 2;
        } else {
          sh = sw;
          sy = (video.videoHeight - sh) / 2;
        }
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(mx, my, mw, mh, 8);
        ctx.clip();
        ctx.drawImage(video, sx, sy, sw, sh, mx, my, mw, mh);
        const shade = ctx.createLinearGradient(0, my + mh - 150, 0, my + mh);
        shade.addColorStop(0, "rgba(0,0,0,0)");
        shade.addColorStop(1, "rgba(0,0,0,0.78)");
        ctx.fillStyle = shade;
        ctx.fillRect(mx, my + mh - 150, mw, 150);
        ctx.restore();
        const cap = summary.meme?.caption;
        if (cap) {
          ctx.fillStyle = "#ffffff";
          ctx.font = `800 26px ${family}`;
          let cy = my + mh - 24;
          for (const l of wrap(cap.toUpperCase(), mw - 48).slice(0, 3).reverse()) {
            ctx.fillText(l, mx + 24, cy);
            cy -= 32;
          }
        }
      } else {
        ctx.strokeStyle = "rgba(255,107,74,0.35)";
        ctx.lineWidth = 2;
        ctx.strokeRect(mx, my, mw, mh);
      }

      // Brand
      let bx = 64;
      if (logo && logo.naturalWidth > 0) {
        ctx.drawImage(logo, 64, 52, 36, 36);
        bx = 112;
      }
      ctx.fillStyle = "#e5e1e4";
      ctx.font = `800 26px ${family}`;
      ctx.fillText("APIForge", bx, 80);
      const bw = ctx.measureText("APIForge").width;
      ctx.fillStyle = "#ff7a5c";
      ctx.font = `600 15px ${mono}`;
      ctx.fillText("ROAST MY API", bx + bw + 14, 79);

      // Spec title
      ctx.fillStyle = "#958ea0";
      ctx.font = `600 18px ${mono}`;
      ctx.fillText(report.title.slice(0, 48).toUpperCase(), 64, 150);

      // Score
      ctx.fillStyle = "#ff6b4a";
      ctx.font = `800 148px ${family}`;
      ctx.fillText(String(report.score), 58, 294);
      const sw2 = ctx.measureText(String(report.score)).width;
      ctx.fillStyle = "#958ea0";
      ctx.font = `700 38px ${family}`;
      ctx.fillText("/100", 58 + sw2 + 10, 294);

      // Tier stamp
      ctx.save();
      ctx.translate(64 + sw2 + 150, 230);
      ctx.rotate(-0.08);
      ctx.strokeStyle = "#ff6b4a";
      ctx.lineWidth = 3;
      ctx.font = `800 20px ${mono}`;
      const tw = ctx.measureText(tier.toUpperCase()).width + 28;
      ctx.strokeRect(0, -26, tw, 40);
      ctx.fillStyle = "#ff6b4a";
      ctx.fillText(tier.toUpperCase(), 14, 2);
      ctx.restore();

      // Verdict
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 46px ${family}`;
      let y = 376;
      for (const line of wrap(summary.verdict, 600).slice(0, 2)) {
        ctx.fillText(line, 64, y);
        y += 54;
      }

      // Roast excerpt
      ctx.fillStyle = "#cbc3d7";
      ctx.font = `500 22px ${family}`;
      y += 6;
      for (const line of wrap(firstSentence(summary.roast, 140), 600).slice(0, 3)) {
        ctx.fillText(line, 64, y);
        y += 31;
      }

      // Attribution
      ctx.fillStyle = "#958ea0";
      ctx.font = `600 16px ${mono}`;
      ctx.fillText(`${report.endpointsCount} ENDPOINTS · ${summary.totalFindings} ISSUES · APIFORGE.INFO/ROAST-MY-API`, 64, 584);

      try {
        const link = document.createElement("a");
        link.download = `apiforge-roast-${report.score}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("Card saved", { description: link.download, id: "roast-card" });
      } catch {
        toast.error("Couldn't save the card", { description: "Take a screenshot of the poster instead.", id: "roast-card" });
      }
    };

    const logo = new Image();
    logo.onload = () => render(logo);
    logo.onerror = () => render();
    logo.src = ROAST_LOGO_PATH;
  }, [report, summary, tier]);

  return {
    origin,
    reportUrl,
    roastUrl,
    badgeUrl,
    markdown,
    html,
    tier,
    draftFor,
    challengeUrl,
    challengeMessage,
    challengeText,
    copied,
    canNativeShare,
    copy,
    shareX,
    shareLinkedIn,
    shareNative,
    downloadCard,
  };
}
