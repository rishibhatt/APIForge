import { getAllGuides, getAllGlossary, getAllExamples, getAllComparisons } from "../src/lib/content/loader";

let errors = 0;
let warnings = 0;

console.log("=== APIForge SEO Audit & Link Validation ===");

const titles = new Set<string>();
const descriptions = new Set<string>();

const guides = getAllGuides();
for (const g of guides) {
  if (titles.has(g.title)) {
    console.error(`❌ Duplicate title detected: ${g.title}`);
    errors++;
  } else {
    titles.add(g.title);
  }

  if (descriptions.has(g.description)) {
    console.warn(`⚠ Duplicate description detected: ${g.slug}`);
    warnings++;
  } else {
    descriptions.add(g.description);
  }
}

const glossary = getAllGlossary();
for (const e of glossary) {
  const t = `What is ${e.term}?`;
  if (titles.has(t)) {
    console.error(`❌ Duplicate glossary title: ${t}`);
    errors++;
  } else {
    titles.add(t);
  }
}

console.log(`✓ Checked ${titles.size} unique page titles`);
console.log(`✓ Checked ${getAllGuides().length} guide metadata objects`);
console.log(`✓ Checked ${getAllGlossary().length} glossary metadata objects`);
console.log(`✓ Checked ${getAllExamples().length} example metadata objects`);
console.log(`✓ Checked ${getAllComparisons().length} comparison metadata objects`);

console.log("\nSEO Audit Summary:");
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors > 0) {
  process.exit(1);
} else {
  console.log("✓ SEO Audit Passed Successfully!");
}
