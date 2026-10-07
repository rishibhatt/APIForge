import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { contentRegistry } from "../src/content/registry";
import { extractEndpointsFromSpec } from "../src/lib/extract-endpoints";
import { normalizeFromEndpoints } from "../src/lib/api-quality-score/normalize-api-input";
import { calculateApiScore } from "../src/lib/api-quality-score/scoringEngine";
import {
  COMPETING_TYPES,
  OVERLAP_THRESHOLD,
  buildLinkGraph,
  recentlyTouched,
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
  const type = flag("type");
  const skipDays = Number(flag("skip-recent") ?? 0);
  const skip = skipDays > 0 ? recentlyTouched(skipDays) : new Set<string>();
  const all = contentRegistry.all
    .filter((item) => !type || item.type === type)
    .map(reportGuide)
    .sort((a, b) => b.weakness - a.weakness);
  const queue = all.filter((r) => !skip.has(r.slug));
  if (rest.includes("--json")) {
    console.log(JSON.stringify(queue, null, 2));
    return;
  }
  console.log("Content quality audit (weakest first)\n");
  for (const r of queue) {
    console.log(
      `${r.type}:${r.slug}  words=${r.words} links=${r.internalLinks} refs=${r.externalRefs} code=${r.codeBlocks} ` +
        `faqs=${r.faqs} weakness=${r.weakness.toFixed(0)}`,
    );
    for (const issue of r.issues) console.log(`   - ${issue}`);
  }
  const passing = all.filter((r) => r.issues.length === 0).length;
  console.log(`\n${passing}/${all.length} pages pass every gate.`);
  if (skip.size > 0) console.log(`Skipped (touched in last ${skipDays} days): ${Array.from(skip).join(", ")}`);
  console.log(`Refresh queue: ${queue.slice(0, 5).map((r) => `${r.type}:${r.slug}`).join(", ")}`);
}

function links() {
  const graph = buildLinkGraph();
  const nodes = Array.from(graph.values()).sort((a, b) => a.inbound.length - b.inbound.length);
  if (rest.includes("--json")) {
    console.log(JSON.stringify(nodes, null, 2));
    return;
  }
  console.log("Internal link graph (fewest inbound links first)\n");
  for (const n of nodes) console.log(`in=${n.inbound.length} out=${n.outbound.length}  ${n.key}`);
  const orphans = nodes.filter((n) => n.inbound.length === 0);
  console.log(`\nOrphans (no inbound content links): ${orphans.length}`);
  for (const o of orphans) console.log(`  ${o.key}`);
}

function suggestLinks() {
  const slug = flag("slug");
  if (!slug) {
    console.error("Usage: content-ops suggest-links --slug <new-slug>");
    process.exit(1);
  }
  const target = contentRegistry.all.find((i) => i.slug === slug);
  if (!target) {
    console.error(`Unknown slug: ${slug}`);
    process.exit(1);
  }
  const graph = buildLinkGraph();
  const targetKey = Array.from(graph.values()).find((n) => n.slug === slug)!.key;
  const ranked = contentRegistry.all
    .filter((i) => i.slug !== slug)
    .map((i) => {
      const node = Array.from(graph.values()).find((n) => n.slug === i.slug)!;
      return {
        item: i,
        score: similarity(signatureOf(target), signatureOf(i)),
        alreadyLinks: node.outbound.includes(targetKey),
      };
    })
    .filter((r) => !r.alreadyLinks && r.score >= 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  console.log(`Existing pages worth linking to ${slug} (related, not yet linking):`);
  for (const r of ranked) console.log(`  ${r.score.toFixed(2)}  ${r.item.type}:${r.item.slug}  "${r.item.title}"`);
  if (ranked.length === 0) console.log("  none above 0.10 similarity");
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

const commands: Record<string, () => void> = { audit, links, "suggest-links": suggestLinks, pairs, overlap, score };
const run = commands[command ?? ""];
if (!run) {
  console.error("Commands: audit [--json] [--type guide] [--skip-recent 14] | links [--json] | suggest-links --slug <slug> | pairs [--min 0.3] | overlap --title ... | score <spec-file>");
  process.exit(1);
}
run();
