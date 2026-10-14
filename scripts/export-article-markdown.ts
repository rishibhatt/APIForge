import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ContentBlock, KnowledgeItem } from "../src/content/types";
import { contentRegistry } from "../src/content/registry";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";
const TYPE_PATHS: Record<string, string> = {
  guide: "/guides", glossary: "/glossary", example: "/examples", comparison: "/compare",
  checklist: "/checklists", reference: "/reference", "tool-guide": "/guides",
};

function absolutize(text: string): string {
  return text.replace(/\]\((\/[^)\s]*)\)/g, (_m, p: string) => `](${SITE}${p})`);
}

function row(cells: string[]): string {
  return `| ${cells.map((c) => c.replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |`;
}

function table(headers: string[], rows: string[][]): string {
  return [row(headers), row(headers.map(() => "---")), ...rows.map(row)].join("\n");
}

function blockToMarkdown(b: ContentBlock): string {
  switch (b.type) {
    case "paragraph":
      return absolutize(b.text);
    case "heading":
      return `${"#".repeat(b.level)} ${b.text}`;
    case "code":
      return `${b.caption ? `*${b.caption}*\n\n` : ""}\`\`\`${b.language}\n${b.code}\n\`\`\``;
    case "quote":
      return `> ${b.text}`;
    case "list":
      return b.items.map((it, i) => `${b.ordered ? `${i + 1}.` : "-"} ${absolutize(it)}`).join("\n");
    case "callout":
      return `> **${b.title ?? "Note"}**\n> ${absolutize(b.text)}`;
    case "summary":
    case "tip":
    case "warning":
      return `> **${b.title}**\n> ${absolutize(b.text)}`;
    case "table":
      return `${table(b.headers, b.rows.map((r) => r.map(absolutize)))}${b.caption ? `\n\n*${b.caption}*` : ""}`;
    case "comparison":
      return table(b.headers, b.rows.map((r) => r.map(absolutize)));
    case "checklist":
      return `${b.title ? `**${b.title}**\n\n` : ""}${b.items.map((i) => `- [${i.done ? "x" : " "}] ${i.text}`).join("\n")}`;
    case "steps":
      return `${b.title ? `**${b.title}**\n\n` : ""}${b.steps
        .map((s, i) => `${i + 1}. **${s.title}** ${absolutize(s.description)}${s.code ? `\n\n\`\`\`yaml\n${s.code}\n\`\`\`` : ""}`)
        .join("\n")}`;
    case "example":
    case "badExample":
    case "goodExample":
      return `**${b.title}**\n\n\`\`\`${b.language}\n${b.code}\n\`\`\`\n\n${absolutize(b.explanation)}`;
    case "decisionTree":
      return `**${b.title}**\n\n${table(
        ["Condition", "Recommendation", "Alternative"],
        b.nodes.map((n) => [n.condition, n.recommendation, n.alternative ?? ""]),
      )}`;
    case "tool":
    case "cta":
      return `**${b.title}** ${b.description} [${b.buttonText}](${SITE}${b.href})`;
    case "relatedContent": {
      const links = b.slugs
        .map((slug) => contentRegistry.all.find((i) => i.slug === slug))
        .filter((i): i is KnowledgeItem => Boolean(i))
        .map((i) => `- [${i.title}](${SITE}${TYPE_PATHS[i.type]}/${i.slug})`);
      return links.length ? `**Related reading**\n\n${links.join("\n")}` : "";
    }
    case "externalReference":
      return `- [${b.title}](${b.url}) (${b.source})`;
    default:
      return "";
  }
}

const slug = process.argv[2];
const item = contentRegistry.all.find((i) => i.slug === slug);
if (!slug || !item) {
  console.error("Usage: npm run content:export -- <slug>");
  process.exit(1);
}

const sources = item.blocks.filter((b) => b.type === "externalReference");
const body = item.blocks
  .filter((b) => b.type !== "externalReference")
  .map(blockToMarkdown)
  .filter(Boolean)
  .join("\n\n");
const faq = (item.faqs ?? []).map((f) => `### ${f.question}\n\n${absolutize(f.answer)}`).join("\n\n");
const canonical = `${SITE}${TYPE_PATHS[item.type]}/${item.slug}`;
const tags = (item.tags ?? [])
  .slice(0, 4)
  .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ""))
  .filter(Boolean);

const markdown = [
  "---",
  `title: ${JSON.stringify(item.title)}`,
  "published: false",
  `description: ${JSON.stringify(item.description)}`,
  `tags: ${tags.join(", ")}`,
  `canonical_url: ${canonical}`,
  "---",
  "",
  body,
  faq ? `\n## FAQ\n\n${faq}` : "",
  sources.length ? `\n## Sources\n\n${sources.map(blockToMarkdown).join("\n")}` : "",
  "",
  `*Originally published at [apiforge.info](${canonical}).*`,
  "",
].join("\n");

const date = new Date().toISOString().slice(0, 10);
const dir = path.join(".publish-out", date);
mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${item.slug}.devto.md`);
writeFileSync(file, markdown);
console.log(`Wrote ${file} (${markdown.split(/\s+/).length} words). canonical_url set to ${canonical}`);
