import { readFileSync } from "node:fs";
import type { Metadata } from "next";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
import { contentRegistry } from "../src/content/registry";
import {
  getAllComparisons,
  getAllExamples,
  getAllGlossary,
  getAllGuides,
} from "../src/lib/content/loader";
import {
  createArticleMetadata,
  createComparisonMetadata,
  createExampleMetadata,
  createGlossaryMetadata,
} from "../src/lib/seo/metadata";
import { buildLinkGraph, reportGuide } from "./lib/content-quality";

const live = process.argv.includes("--live");
const asJson = process.argv.includes("--json");
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";

type Finding = { level: "error" | "warn"; area: string; message: string };
const findings: Finding[] = [];
const add = (level: Finding["level"], area: string, message: string) => findings.push({ level, area, message });

function titleOf(meta: Metadata): string {
  const t = meta.title as string | { absolute?: string; default?: string } | undefined;
  if (!t) return "";
  if (typeof t === "string") return `${t} | APIForge`;
  return t.absolute ?? t.default ?? "";
}

function descriptionOf(meta: Metadata): string {
  return typeof meta.description === "string" ? meta.description : "";
}

// 1. Per-page metadata
const pages: Array<{ id: string; meta: Metadata }> = [
  ...getAllGuides().map((g) => ({ id: `guide:${g.slug}`, meta: createArticleMetadata(g) })),
  ...getAllGlossary().map((e) => ({ id: `glossary:${e.slug}`, meta: createGlossaryMetadata(e) })),
  ...getAllExamples().map((e) => ({ id: `example:${e.slug}`, meta: createExampleMetadata(e) })),
  ...getAllComparisons().map((c) => ({ id: `compare:${c.slug}`, meta: createComparisonMetadata(c) })),
];

const seenTitles = new Map<string, string>();
const seenDescriptions = new Map<string, string>();
for (const { id, meta } of pages) {
  const title = titleOf(meta);
  const desc = descriptionOf(meta);
  if (title.length > 70) add("error", "title", `${id}: ${title.length} chars, Google will truncate (max ~60): "${title}"`);
  else if (title.length > 60) add("warn", "title", `${id}: ${title.length} chars (target 60 or fewer)`);
  if (title.length < 20) add("warn", "title", `${id}: ${title.length} chars, too short to carry a keyword`);
  if (desc.length < 100) add("warn", "description", `${id}: ${desc.length} chars (target 140-160)`);
  if (desc.length > 160) add("error", "description", `${id}: ${desc.length} chars (max 160)`);
  if (seenTitles.has(title)) add("error", "title", `${id}: duplicate title with ${seenTitles.get(title)}`);
  else seenTitles.set(title, id);
  if (seenDescriptions.has(desc)) add("warn", "description", `${id}: duplicate description with ${seenDescriptions.get(desc)}`);
  else seenDescriptions.set(desc, id);
  const canonical = (meta.alternates as { canonical?: string } | undefined)?.canonical;
  if (!canonical) add("error", "canonical", `${id}: no canonical URL`);
}

// 2. Sitemap
const entries = sitemap();
const urls = entries.map((e) => e.url);
const urlSet = new Set(urls);
if (urlSet.size !== urls.length) add("error", "sitemap", "duplicate URLs in sitemap");

const TYPE_PATHS: Record<string, string> = {
  guide: "/guides", glossary: "/glossary", example: "/examples", comparison: "/compare",
  checklist: "/checklists", reference: "/reference", "tool-guide": "/guides",
};
for (const item of contentRegistry.all) {
  const url = `${SITE}${TYPE_PATHS[item.type]}/${item.slug}`;
  if (!urlSet.has(url)) add("error", "sitemap", `missing from sitemap: ${url}`);
}

const today = new Date().toISOString().slice(0, 10);
const contentEntries = entries.filter((e) => /\/(guides|glossary|examples|compare|checklists|reference)\//.test(e.url));
const stamped = contentEntries.filter((e) => new Date(e.lastModified as Date).toISOString().slice(0, 10) === today);
if (contentEntries.length > 0 && stamped.length / contentEntries.length > 0.6) {
  add("warn", "sitemap", `${stamped.length}/${contentEntries.length} content URLs have lastModified = today; Google ignores lastmod when it is unreliable`);
}
const staticEntries = entries.filter((e) => !contentEntries.includes(e));
if (staticEntries.length > 0 && staticEntries.every((e) => new Date(e.lastModified as Date).toISOString().slice(0, 10) === today)) {
  add("warn", "sitemap", "static routes use lastModified = build date on every build; use real dates or omit lastModified");
}

// 3. Robots
const robotsConfig = robots();
if (!robotsConfig.sitemap) add("error", "robots", "robots has no sitemap line");
const rules = ([] as Array<{ userAgent?: string | string[]; disallow?: string | string[] }>).concat(
  robotsConfig.rules as never,
);
if (!rules.some((r) => [r.disallow].flat().includes("/api/"))) add("warn", "robots", "/api/ is not disallowed");
if (rules.some((r) => [r.disallow].flat().includes("/"))) add("error", "robots", "robots disallows the whole site");

// 4. Code-level checks
function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
const home = read("src/app/page.tsx");
if (!/generateWebSiteJsonLd|generateSoftwareApplicationJsonLd/.test(home)) add("error", "jsonld", "homepage has no WebSite/SoftwareApplication JSON-LD");
const roastPage = read("src/app/roast/[reportId]/page.tsx");
if (!/index:\s*false/.test(roastPage)) add("error", "indexing", "roast report pages are not noindex (ephemeral in-memory reports)");
const layout = read("src/app/layout.tsx");
if (!/metadataBase/.test(layout)) add("error", "metadata", "layout has no metadataBase");

// 5. Internal link graph
const graph = buildLinkGraph();
for (const node of Array.from(graph.values())) {
  if (node.inbound.length === 0) add("warn", "links", `orphan page (no inbound content links): ${node.key}`);
}
for (const item of contentRegistry.all) {
  const r = reportGuide(item);
  if (r.brokenLinks.length) add("error", "links", `${item.type}:${item.slug} links to missing routes: ${r.brokenLinks.join(", ")}`);
}

async function liveCheck() {
  const get = async (path: string) => {
    const res = await fetch(`${SITE}${path}`, { signal: AbortSignal.timeout(20000) });
    return { status: res.status, text: await res.text() };
  };
  try {
    const sm = await get("/sitemap.xml");
    if (sm.status !== 200) add("error", "live", `sitemap.xml returned ${sm.status}`);
    const liveUrls = new Set(Array.from(sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].replace(/\/$/, "")));
    const local = new Set(urls.map((u) => u.replace(/\/$/, "")));
    const notDeployed = Array.from(local).filter((u) => !liveUrls.has(u));
    const stale = Array.from(liveUrls).filter((u) => !local.has(u));
    if (notDeployed.length) add("warn", "live", `${notDeployed.length} local URLs not in live sitemap yet (deploy pending): ${notDeployed.slice(0, 8).join(", ")}`);
    if (stale.length) add("warn", "live", `${stale.length} live sitemap URLs missing locally: ${stale.slice(0, 8).join(", ")}`);
    const rb = await get("/robots.txt");
    if (rb.status !== 200) add("error", "live", `robots.txt returned ${rb.status}`);
    const sample = Array.from(liveUrls).slice(0, 12);
    for (const u of sample) {
      const res = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(20000) });
      if (res.status !== 200) add("error", "live", `${u} returned ${res.status}`);
    }
  } catch (e) {
    add("warn", "live", `live check failed: ${(e as Error).message}`);
  }
}

async function main() {
  if (live) await liveCheck();
  const errors = findings.filter((f) => f.level === "error");
  const warns = findings.filter((f) => f.level === "warn");
  if (asJson) {
    console.log(JSON.stringify({ errors: errors.length, warnings: warns.length, findings }, null, 2));
  } else {
    console.log("=== APIForge SEO site audit ===");
    console.log(`Checked ${pages.length} page metadata sets, ${urls.length} sitemap URLs, ${graph.size} content pages${live ? ", live site" : ""}.`);
    for (const f of findings) console.log(`${f.level === "error" ? "ERROR" : "warn "} [${f.area}] ${f.message}`);
    console.log(`\nErrors: ${errors.length}  Warnings: ${warns.length}`);
  }
  if (errors.length > 0) process.exit(1);
}

void main();
