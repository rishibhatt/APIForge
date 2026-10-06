import type { CSSProperties } from "react";
import type { ImageResponse } from "next/og";
import { getAppLogoBase64, FIRE_LOGO_DATA_URI } from "@/lib/seo/brandLogo";

type ImageResponseOptions = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>;

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_SUBLINE = "Free online OpenAPI and Swagger validator, API tester, and 0–100 quality score.";
export const OG_DEFAULT_TITLE = "Parse, test, and grade any OpenAPI or Swagger spec";
export const OG_ALT = `APIForge: ${OG_DEFAULT_TITLE}`;

export const ROAST_DEFAULT_TITLE = "SHIP IT. WE'LL JUDGE IT.";
export const ROAST_SUBLINE = "Paste an OpenAPI spec. Get a score, a roast, and a meme.";
export const ROAST_ALT = "APIForge Roast My API: paste an OpenAPI spec, get a score, a roast, and a meme";

const FONT = "PlusJakarta, sans-serif";
const MAX_TITLE = 110;

/* ---------- Fonts (best effort, never throws) ---------- */

type OgFonts = NonNullable<ImageResponseOptions["fonts"]>;
let fontsPromise: Promise<OgFonts | undefined> | undefined;

async function fetchFonts(): Promise<OgFonts | undefined> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 2500);
    try {
      // No browser user agent => Google serves TrueType, which Satori can parse (it cannot read woff2).
      const css = await (
        await fetch("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800", {
          signal: ctl.signal,
        })
      ).text();
      const blocks = css.match(/@font-face\s*{[^}]+}/g) ?? [];
      const out: OgFonts = [];
      for (const block of blocks) {
        const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1]);
        const url = /src:\s*url\(([^)]+)\)/.exec(block)?.[1];
        if (!weight || !url) continue;
        const res = await fetch(url.replace(/['"]/g, ""), { signal: ctl.signal });
        if (!res.ok) continue;
        out.push({
          name: "PlusJakarta",
          data: await res.arrayBuffer(),
          weight: weight >= 700 ? 800 : 500,
          style: "normal",
        });
      }
      return out.length ? out : undefined;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return undefined;
  }
}

/** ImageResponse options with Plus Jakarta Sans when reachable, plain sans-serif otherwise. */
export async function ogImageOptions(extra: ImageResponseOptions = {}): Promise<ImageResponseOptions> {
  fontsPromise ??= fetchFonts();
  const fonts = await fontsPromise;
  if (!fonts) fontsPromise = undefined; // retry on a later request
  return { ...OG_SIZE, ...(fonts ? { fonts } : {}), ...extra };
}

/* ---------- Helpers ---------- */

/** Engineering grid as real 1px elements: Satori cannot parse the CSS gradient version. */
function GridLines({ color }: { color: string }) {
  const verticals = Array.from({ length: 28 }, (_, i) => i * 44);
  const horizontals = Array.from({ length: 15 }, (_, i) => i * 44);
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "1200px", height: "630px", display: "flex" }}>
      {verticals.map((x) => (
        <div key={`v${x}`} style={{ position: "absolute", top: 0, left: `${x}px`, width: "1px", height: "630px", backgroundColor: color }} />
      ))}
      {horizontals.map((y) => (
        <div key={`h${y}`} style={{ position: "absolute", left: 0, top: `${y}px`, width: "1200px", height: "1px", backgroundColor: color }} />
      ))}
    </div>
  );
}

export function clampOgTitle(title: string, max = MAX_TITLE): string {
  const t = title.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.55 ? lastSpace : cut.length)}…`;
}

function titleSize(len: number): number {
  if (len <= 40) return 80;
  if (len <= 60) return 72;
  if (len <= 80) return 60;
  return 52;
}

const BALANCE = { textWrap: "balance" } as CSSProperties;

/* ---------- Default (Kinetic Terminal) card ---------- */

/**
 * Shared 1200x630 social card, "Kinetic Terminal": dark ground, faint engineering grid,
 * violet bloom, violet mark. Rendered by opengraph-image, twitter-image and /api/og.
 */
export function OgCard({ title, label }: { title: string; label?: string }) {
  const text = clampOgTitle(title);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: "#131315",
        fontFamily: FONT,
        color: "#ffffff",
      }}
    >
      <GridLines color="rgba(255,255,255,0.04)" />
      <div
        style={{
          position: "absolute",
          top: "-260px",
          right: "-220px",
          width: "820px",
          height: "820px",
          display: "flex",
          backgroundImage: "radial-gradient(circle, rgba(160,120,255,0.26) 0%, rgba(160,120,255,0) 65%)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getAppLogoBase64()} alt="" width={48} height={48} />
            <span style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em", color: "#ffffff" }}>
              APIForge
            </span>
          </div>
          {label ? (
            <span
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#d0bcff",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
              }}
            >
              {label}
            </span>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "26px", maxWidth: "1040px" }}>
          <div
            style={{
              display: "flex",
              fontSize: `${titleSize(text.length)}px`,
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: "-0.035em",
              color: "#ffffff",
              ...BALANCE,
            }}
          >
            {text}
          </div>
          <div style={{ display: "flex", fontSize: "28px", lineHeight: 1.4, color: "#cbc3d7", maxWidth: "900px" }}>
            {OG_SUBLINE}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              width: "140px",
              height: "6px",
              borderRadius: "3px",
              backgroundImage: "linear-gradient(90deg, #d0bcff, #a078ff)",
            }}
          />
          <span style={{ fontSize: "22px", fontWeight: 500, color: "#cbc3d7", letterSpacing: "0.04em" }}>
            apiforge.info
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Roast (ember) card ---------- */

export interface RoastOgCardProps {
  /** Shared-report variant: score out of 100. */
  score?: number;
  /** Shared-report variant: verdict used as the headline. */
  verdict?: string;
  /** Shared-report variant: name of the roasted API. */
  apiTitle?: string;
}

export function RoastOgCard({ score, verdict, apiTitle }: RoastOgCardProps) {
  const isReport = typeof score === "number" && Number.isFinite(score);
  const headline = isReport
    ? clampOgTitle(verdict || "Roasted", 60).toUpperCase()
    : ROAST_DEFAULT_TITLE;
  const subline = isReport
    ? `Roasted: ${clampOgTitle(apiTitle || "Untitled API", 70)}`
    : ROAST_SUBLINE;
  const headSize = isReport
    ? headline.length > 36
      ? 52
      : headline.length > 20
        ? 60
        : 68
    : 84;
  const scoreText = isReport ? `${Math.max(0, Math.min(100, Math.round(score as number)))}/100` : "";

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: "#140f0d",
        fontFamily: FONT,
        color: "#ffffff",
      }}
    >
      <GridLines color="rgba(255,138,92,0.06)" />
      <div
        style={{
          position: "absolute",
          bottom: "-420px",
          left: "100px",
          width: "1000px",
          height: "760px",
          display: "flex",
          backgroundImage: "radial-gradient(circle, rgba(255,106,60,0.36) 0%, rgba(224,72,40,0) 65%)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px 60px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FIRE_LOGO_DATA_URI} alt="" width={84} height={84} />
            <span style={{ fontSize: "34px", fontWeight: 800, letterSpacing: "-0.02em", color: "#ffb38a" }}>
              APIForge
            </span>
          </div>
          <span
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#ff7a5c",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
            }}
          >
            ROAST MY API
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: "1040px" }}>
          {isReport ? (
            <div
              style={{
                display: "flex",
                fontSize: "112px",
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: "#ff7a5c",
              }}
            >
              {scoreText}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: `${headSize}px`,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              ...BALANCE,
            }}
          >
            {headline}
          </div>
          <div style={{ display: "flex", fontSize: "28px", lineHeight: 1.4, color: "#e6cfc4", maxWidth: "940px" }}>
            {subline}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              width: "140px",
              height: "6px",
              borderRadius: "3px",
              backgroundImage: "linear-gradient(90deg, #ff8a5c, #e04828)",
            }}
          />
          <span style={{ fontSize: "22px", fontWeight: 500, color: "#e6cfc4", letterSpacing: "0.04em" }}>
            apiforge.info/roast-my-api
          </span>
        </div>
      </div>
    </div>
  );
}
