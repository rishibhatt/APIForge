/**
 * Self-hosts a subset of the Material Symbols icon font with only the glyphs the app uses.
 *
 * Scans src/ for quoted snake_case strings, keeps the ones in the vendored catalog
 * (scripts/material-symbols-names.json, from fonts.google.com/metadata/icons), asks Google
 * Fonts for that subset, and saves the woff2 to src/app/fonts/material-symbols.woff2,
 * which layout.tsx loads with next/font/local.
 *
 * Run `npm run icons:sync` after adding or renaming an icon, then commit the woff2.
 * Needs network access; the build itself does not.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
const OUT = "src/app/fonts/material-symbols.woff2";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const catalog = new Set(JSON.parse(readFileSync("scripts/material-symbols-names.json", "utf8")));
const names = new Set();

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      // Skip the article data (src/content), not components that happen to live in a "content" folder.
      if (p === join(ROOT, "content") || entry === "__tests__") continue;
      walk(p);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      const src = readFileSync(p, "utf8");
      for (const m of src.matchAll(/["'`]([a-z][a-z0-9_]{1,40})["'`]/g)) {
        if (catalog.has(m[1])) names.add(m[1]);
      }
    }
  }
}

walk(ROOT);
const list = [...names].sort();
const cssUrl =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" +
  `&icon_names=${list.join(",")}&display=block`;

const css = await (await fetch(cssUrl, { headers: { "User-Agent": UA } })).text();
const fontUrl = css.match(/url\((https:[^)]+)\)/)?.[1];
if (!fontUrl) throw new Error(`No font URL in Google Fonts response:\n${css.slice(0, 300)}`);
const buf = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());
writeFileSync(OUT, buf);
console.log(`icon font: ${list.length} icons, ${(buf.length / 1024).toFixed(1)} KB -> ${OUT}`);
