import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { contentRegistry } from "../src/content/registry";
import { extractEndpointsFromSpec } from "../src/lib/extract-endpoints";
import { normalizeFromEndpoints } from "../src/lib/api-quality-score/normalize-api-input";
import { calculateApiScore } from "../src/lib/api-quality-score/scoringEngine";
import {
  COMPETING_TYPES,
  OVERLAP_THRESHOLD,
  reportGuide,
  signatureOf,
  similarity,
  type TopicSignature,
} from "./lib/content-quality";

const [command, ...rest] = process.argv.slice(2);

function flag(name: string): string | undefined {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
}

function audit() {
  const reports = contentRegistry.guides.map(reportGuide).sort((a, b) => b.weakness - a.weakness);
  if (rest.includes("--json")) {
    console.log(JSON.stringify(reports, null, 2));
    return;
  }
  console.log("Guide quality audit (weakest first)\n");
  for (const r of reports) {
    console.log(
      `${r.slug}  words=${r.words} links=${r.internalLinks} refs=${r.externalRefs} code=${r.codeBlocks} ` +
        `faqs=${r.faqs} weakness=${r.weakness.toFixed(0)}`,
    );
    for (const issue of r.issues) console.log(`   - ${issue}`);
  }
  const passing = reports.filter((r) => r.issues.length === 0).length;
  console.log(`\n${passing}/${reports.length} guides pass every gate.`);
  console.log(`Refresh queue: ${reports.slice(0, 5).map((r) => r.slug).join(", ")}`);
}

function pairs() {
  const min = Number(flag("min") ?? 0.3);
  const items = contentRegistry.all;
  const found: Array<[number, string, string]> = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const s = similarity(signatureOf(items[i]), signatureOf(items[j]));
      if (s >= min) found.push([s, `${items[i].type}:${items[i].slug}`, `${items[j].type}:${items[j].slug}`]);
    }
  }
  found.sort((a, b) => b[0] - a[0]);
  console.log(`Content pairs with topic similarity >= ${min} (cannibalization candidates)\n`);
  for (const [s, a, b] of found) console.log(`${s.toFixed(2)}  ${a}  <->  ${b}`);
  if (found.length === 0) console.log("none");
}

function overlap() {
  const title = flag("title");
  if (!title) {
    console.error('Usage: content-ops overlap --title "..." [--keyword "..."] [--keywords "a,b"] [--headings "a|b"] [--exclude slug]');
    process.exit(1);
  }
  const candidate: TopicSignature = {
    title,
    primaryKeyword: flag("keyword"),
    keywords: (flag("keywords") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    headings: (flag("headings") ?? "").split("|").map((s) => s.trim()).filter(Boolean),
    description: flag("description"),
  };
  const exclude = flag("exclude");
  const scored = contentRegistry.all
    .filter((item) => item.slug !== exclude)
    .map((item) => ({ item, score: similarity(candidate, signatureOf(item)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  console.log(`Closest existing content for "${title}":`);
  for (const { item, score } of scored) console.log(`  ${score.toFixed(2)}  ${item.type}:${item.slug}  "${item.title}"`);
  const competitor = scored.find(({ item, score }) => COMPETING_TYPES.has(item.type) && score >= OVERLAP_THRESHOLD);
  if (competitor) {
    console.log(`\nOVERLAP (>= ${OVERLAP_THRESHOLD}): refresh ${competitor.item.type}:${competitor.item.slug} instead of writing a new page.`);
    process.exit(2);
  }
  console.log(`\nOK: no competing page above ${OVERLAP_THRESHOLD}. Link to related glossary/example pages listed above.`);
}

function score() {
  const file = rest[0];
  if (!file) {
    console.error("Usage: content-ops score <spec.json|spec.yaml>");
    process.exit(1);
  }
  const text = readFileSync(file, "utf8");
  const doc = (text.trim().startsWith("{") ? JSON.parse(text) : yaml.load(text)) as Record<string, unknown>;
  const endpoints = extractEndpointsFromSpec(doc);
  const result = calculateApiScore(normalizeFromEndpoints(endpoints));
  console.log(JSON.stringify({ endpoints: endpoints.length, ...result }, null, 2));
}

const commands: Record<string, () => void> = { audit, pairs, overlap, score };
const run = commands[command ?? ""];
if (!run) {
  console.error("Commands: audit [--json] | pairs [--min 0.3] | overlap --title ... | score <spec-file>");
  process.exit(1);
}
run();
