import { getAllGuides, getAllGlossary, getAllExamples, getAllComparisons } from "../src/lib/content/loader";

let errors = 0;
let warnings = 0;

console.log("=== APIForge Content Validation ===");

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

  if (!g.content || !Array.isArray(g.content) || g.content.length === 0) {
    console.error(`❌ Guide content is empty: ${g.slug}`);
    errors++;
  }
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
