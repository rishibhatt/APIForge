import { execSync } from "node:child_process";
import { getAllGuides, getAllGlossary, getAllExamples, getAllComparisons } from "../src/lib/content/loader";
import { contentRegistry } from "../src/content/registry";
import {
  COMPETING_TYPES,
  OVERLAP_THRESHOLD,
  changedContentSlugs,
  reportGuide,
  signatureOf,
  similarity,
} from "./lib/content-quality";

let errors = 0;
let warnings = 0;

console.log("=== APIForge Content Validation ===");

try {
  execSync("npx tsx scripts/sync-content-index.ts --check", { stdio: "inherit" });
} catch {
  errors++;
}

const guides = getAllGuides();
console.log(`✓ Loaded ${guides.length} guides`);
const seenGuideSlugs = new Set<string>();

for (const g of guides) {
  if (!g.slug || typeof g.slug !== "string") {
    console.error(`❌ Guide missing valid slug: ${g.title}`);
    errors++;
  } else if (seenGuideSlugs.has(g.slug)) {
    console.error(`❌ Duplicate guide slug: ${g.slug}`);
    errors++;
  } else {
    seenGuideSlugs.add(g.slug);
  }

  if (!g.title || g.title.trim().length < 5) {
    console.error(`❌ Guide has missing/too short title: ${g.slug}`);
    errors++;
  }

  if (!g.description || g.description.trim().length < 10) {
    console.error(`❌ Guide has missing/too short description: ${g.slug}`);
    errors++;
  }

  if (!g.updatedAt) {
    console.warn(`⚠ Guide missing updatedAt: ${g.slug}`);
    warnings++;
  }

  const blocks = (g as any).content || g.blocks;
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    console.error(`❌ Guide content is empty: ${g.slug}`);
    errors++;
  }
}

// Quality gates: errors for pages changed in the working tree (or passed via --strict), warnings for the rest.
const strictArgIndex = process.argv.indexOf("--strict");
const strictSlugs = new Set(
  strictArgIndex >= 0 ? process.argv.slice(strictArgIndex + 1).filter((a) => !a.startsWith("--")) : changedContentSlugs(),
);
const today = new Date().toISOString().slice(0, 10);
let legacyIssues = 0;

for (const item of contentRegistry.all) {
  const report = reportGuide(item);
  const issues = [...report.issues];

  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDate.test(item.publishedAt)) issues.push(`publishedAt "${item.publishedAt}" is not YYYY-MM-DD`);
  if (item.updatedAt && !isoDate.test(item.updatedAt)) issues.push(`updatedAt "${item.updatedAt}" is not YYYY-MM-DD`);
  if (item.publishedAt > today || (item.updatedAt ?? "") > today) issues.push("date in the future");
  if (item.updatedAt && item.updatedAt < item.publishedAt) issues.push("updatedAt before publishedAt");
  if (strictSlugs.has(item.slug) && item.type === "guide" && !item.primaryKeyword) issues.push("missing primaryKeyword");

  for (const other of contentRegistry.all) {
    if (!COMPETING_TYPES.has(item.type)) break;
    if (other.slug === item.slug || !COMPETING_TYPES.has(other.type)) continue;
    const s = similarity(signatureOf(item), signatureOf(other));
    if (s >= OVERLAP_THRESHOLD) issues.push(`topic overlap ${s.toFixed(2)} with ${other.type}:${other.slug}`);
  }

  if (issues.length === 0) continue;
  if (strictSlugs.has(item.slug)) {
    console.error(`❌ ${item.slug}`);
    for (const issue of issues) console.error(`   - ${issue}`);
    errors += issues.length;
  } else {
    legacyIssues += issues.length;
  }
}

if (strictSlugs.size > 0) console.log(`✓ Strict quality gates applied to: ${Array.from(strictSlugs).join(", ")}`);
if (legacyIssues > 0) {
  console.warn(`⚠ ${legacyIssues} quality issues in unchanged pages (run: npm run content:audit)`);
  warnings++;
}

const glossary = getAllGlossary();
console.log(`✓ Loaded ${glossary.length} glossary entries`);
const seenGlossarySlugs = new Set<string>();

for (const e of glossary) {
  if (!e.slug || seenGlossarySlugs.has(e.slug)) {
    console.error(`❌ Missing or duplicate glossary slug: ${e.slug}`);
    errors++;
  } else {
    seenGlossarySlugs.add(e.slug);
  }

  if (!e.definition) {
    console.error(`❌ Glossary entry missing definition: ${e.slug}`);
    errors++;
  }
}

const examples = getAllExamples();
console.log(`✓ Loaded ${examples.length} examples`);

const comparisons = getAllComparisons();
console.log(`✓ Loaded ${comparisons.length} comparisons`);

console.log("\nContent Validation Summary:");
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors > 0) {
  process.exit(1);
} else {
  console.log("✓ Content Validation Passed Successfully!");
}
