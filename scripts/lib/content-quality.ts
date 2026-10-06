import { execSync } from "node:child_process";
import type { ContentBlock, KnowledgeItem } from "../../src/content/types";
import { blockText, countBlockWords } from "../../src/content/metrics";
import { contentRegistry } from "../../src/content/registry";

export const MIN_GUIDE_WORDS = 1200;
export const MAX_TITLE_CHARS = 60;
export const DESCRIPTION_RANGE: [number, number] = [110, 160];
export const MAX_EM_DASHES = 2;
export const OVERLAP_THRESHOLD = 0.45;

// Word and phrase lists mirror the no-ai-slop skill.
export const BANNED_WORDS = [
  "delve", "foster", "leverage", "utilize", "utilizing", "utilise", "facilitate", "empower", "empowering",
  "streamline", "robust", "cutting-edge", "paradigm shift", "game changer", "game-changer", "this is huge",
  "this changes everything", "tapestry", "realm", "beacon", "multifaceted", "meticulous", "intricate",
  "paramount", "transformative", "elevate", "embark", "supercharge", "harness", "ever-evolving", "seamless",
  "seamlessly", "unlock",
];

export const FILLER_PHRASES = [
  "it's worth noting", "it's important to note", "at the end of the day", "when it comes to", "at its core",
  "in today's world", "in the age of", "in the world of", "the reality is", "the truth is", "in terms of",
  "with regard to", "going forward", "in this article", "let's dive in", "here's the thing",
  "here's what nobody tells you", "what most people get wrong", "stands as a testament", "plays a vital role",
  "marks a pivotal moment", "in conclusion", "experts agree", "studies show",
];

export const HYPE_TITLE_WORDS = ["complete", "ultimate", "definitive", "master", "comprehensive", "essential"];

export const TOOL_PATHS = [
  "/api-score", "/openapi-validator", "/swagger-validator", "/api-testing", "/roast-my-api", "/api-quality-checker",
];

const STATIC_ROUTES = new Set([
  "/", "/about", "/guides", "/glossary", "/examples", "/compare", "/checklists", "/reference", ...TOOL_PATHS,
]);

const TYPE_PATHS: Record<string, string> = {
  guide: "/guides", glossary: "/glossary", example: "/examples", comparison: "/compare",
  checklist: "/checklists", reference: "/reference", "tool-guide": "/guides",
};

export function routeExists(path: string): boolean {
  const clean = path.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (STATIC_ROUTES.has(clean)) return true;
  return contentRegistry.all.some((item) => `${TYPE_PATHS[item.type]}/${item.slug}` === clean);
}

export function proseOf(item: KnowledgeItem): string {
  const parts = [item.title, item.description, ...item.blocks.flatMap((b) => blockText(b))];
  for (const f of item.faqs ?? []) parts.push(f.question, f.answer);
  return parts.join("\n");
}

export function internalLinks(blocks: ContentBlock[]): string[] {
  const links: string[] = [];
  const text = blocks.flatMap((b) => blockText(b)).join("\n");
  for (const m of Array.from(text.matchAll(/\]\((\/[^)\s]*)\)/g))) links.push(m[1]);
  for (const b of blocks) if ((b.type === "tool" || b.type === "cta") && b.href.startsWith("/")) links.push(b.href);
  return links;
}

export function slopHits(text: string): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const w of BANNED_WORDS) {
    const re = new RegExp(`\\b${w.replace(/[-]/g, "[- ]")}\\b`, "i");
    if (re.test(lower)) hits.push(w);
  }
  for (const p of FILLER_PHRASES) if (lower.includes(p)) hits.push(p);
  return hits;
}

export function emDashCount(text: string): number {
  return (text.match(/—/g) ?? []).length;
}

export interface GuideReport {
  slug: string;
  words: number;
  internalLinks: number;
  brokenLinks: string[];
  toolLinked: boolean;
  externalRefs: number;
  codeBlocks: number;
  faqs: number;
  slop: string[];
  emDashes: number;
  titleChars: number;
  descriptionChars: number;
  issues: string[];
  weakness: number;
}

export function reportGuide(item: KnowledgeItem): GuideReport {
  const words = countBlockWords(item.blocks);
  const links = internalLinks(item.blocks);
  const prose = proseOf(item);
  const report: GuideReport = {
    slug: item.slug,
    words,
    internalLinks: links.length,
    brokenLinks: links.filter((l) => !routeExists(l)),
    toolLinked: links.some((l) => TOOL_PATHS.includes(l.split(/[?#]/)[0])),
    externalRefs: item.blocks.filter((b) => b.type === "externalReference").length,
    codeBlocks: item.blocks.filter((b) => ["code", "example", "badExample", "goodExample"].includes(b.type)).length,
    faqs: (item.faqs ?? []).length,
    slop: slopHits(prose),
    emDashes: emDashCount(prose),
    titleChars: item.title.length,
    descriptionChars: item.description.length,
    issues: [],
    weakness: 0,
  };

  const r = report;
  if (r.words < MIN_GUIDE_WORDS) r.issues.push(`body ${r.words} words (< ${MIN_GUIDE_WORDS})`);
  if (r.titleChars > MAX_TITLE_CHARS) r.issues.push(`title ${r.titleChars} chars (> ${MAX_TITLE_CHARS})`);
  const hype = HYPE_TITLE_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(item.title));
  if (hype.length) r.issues.push(`hype words in title: ${hype.join(", ")}`);
  if (/\(20\d\d\)/.test(item.title)) r.issues.push("year in title");
  if (r.descriptionChars < DESCRIPTION_RANGE[0] || r.descriptionChars > DESCRIPTION_RANGE[1]) {
    r.issues.push(`description ${r.descriptionChars} chars (want ${DESCRIPTION_RANGE[0]}-${DESCRIPTION_RANGE[1]})`);
  }
  if (r.internalLinks < 3) r.issues.push(`${r.internalLinks} internal links (< 3)`);
  if (!r.toolLinked) r.issues.push("no link to an APIForge tool page");
  if (r.brokenLinks.length) r.issues.push(`broken internal links: ${r.brokenLinks.join(", ")}`);
  if (r.externalRefs < 1) r.issues.push("no externalReference source");
  if (r.codeBlocks < 1) r.issues.push("no code or example block");
  if (r.slop.length) r.issues.push(`slop: ${r.slop.join(", ")}`);
  if (r.emDashes > MAX_EM_DASHES) r.issues.push(`${r.emDashes} em dashes (> ${MAX_EM_DASHES})`);

  r.weakness =
    Math.max(0, MIN_GUIDE_WORDS - r.words) / 10 +
    r.slop.length * 8 +
    Math.max(0, 3 - r.internalLinks) * 5 +
    (r.externalRefs ? 0 : 10) +
    (r.codeBlocks ? 0 : 10) +
    r.issues.length * 2;
  return r;
}

const STOPWORDS = new Set(
  ("a an and are as at be by for from how in into is it of on or that the this to vs with your you what why when " +
    "which use using api apis guide guides best practice practices tutorial example examples complete ultimate " +
    "developer developers 2025 2026 rest restful").split(" "),
);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}

export interface TopicSignature {
  title: string;
  primaryKeyword?: string;
  keywords?: string[];
  headings?: string[];
  description?: string;
}

function rawVector(sig: TopicSignature): Map<string, number> {
  const v = new Map<string, number>();
  const add = (text: string | undefined, weight: number) => {
    for (const t of tokens(text ?? "")) v.set(t, (v.get(t) ?? 0) + weight);
  };
  add(sig.title, 3);
  add(sig.primaryKeyword, 4);
  for (const k of sig.keywords ?? []) add(k, 2);
  for (const h of sig.headings ?? []) add(h, 1);
  add(sig.description, 1);
  return v;
}

let idfCache: Map<string, number> | null = null;

// Terms that appear on most pages (openapi, swagger, schema) carry little topic signal.
function idf(): Map<string, number> {
  if (idfCache) return idfCache;
  const docs = contentRegistry.all.map((item) => new Set(Array.from(rawVector(signatureOf(item)).keys())));
  const df = new Map<string, number>();
  for (const doc of docs) for (const t of Array.from(doc)) df.set(t, (df.get(t) ?? 0) + 1);
  idfCache = new Map(Array.from(df.entries()).map(([t, n]) => [t, Math.log(1 + docs.length / n)]));
  return idfCache;
}

function vectorOf(sig: TopicSignature): Map<string, number> {
  const weights = idf();
  const maxIdf = Math.log(1 + contentRegistry.all.length);
  const v = rawVector(sig);
  for (const [t, w] of Array.from(v.entries())) v.set(t, w * (weights.get(t) ?? maxIdf));
  return v;
}

export const COMPETING_TYPES = new Set(["guide", "checklist", "reference", "comparison", "tool-guide"]);

export function similarity(a: TopicSignature, b: TopicSignature): number {
  const va = vectorOf(a);
  const vb = vectorOf(b);
  let dot = 0;
  for (const [k, w] of Array.from(va.entries())) dot += w * (vb.get(k) ?? 0);
  const norm = (v: Map<string, number>) => Math.sqrt(Array.from(v.values()).reduce((s, w) => s + w * w, 0));
  const denom = norm(va) * norm(vb);
  return denom ? dot / denom : 0;
}

export function signatureOf(item: KnowledgeItem): TopicSignature {
  return {
    title: item.title,
    primaryKeyword: item.primaryKeyword,
    keywords: item.keywords ?? item.seo?.keywords ?? [],
    headings: item.blocks.filter((b) => b.type === "heading").map((b) => (b as { text: string }).text),
    description: item.description,
  };
}

export function changedGuideSlugs(): string[] {
  const run = (cmd: string) => {
    try {
      return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      return "";
    }
  };
  const out = [
    run("git diff --name-only origin/main...HEAD"),
    run("git diff --name-only"),
    run("git diff --name-only --cached"),
    run("git ls-files --others --exclude-standard"),
  ].join("\n");
  const slugs = new Set<string>();
  for (const line of out.split(/\r?\n/)) {
    const m = line.trim().match(/^src\/content\/guides\/([a-z0-9-]+)\.json$/);
    if (m) slugs.add(m[1]);
  }
  return Array.from(slugs);
}
