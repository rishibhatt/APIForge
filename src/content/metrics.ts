import type { ContentBlock } from "./types";

const WORDS_PER_MINUTE = 230;

function countWords(text: string | undefined): number {
  if (!text) return 0;
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function blockText(block: ContentBlock): string[] {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return [block.text];
    case "list":
      return block.items;
    case "callout":
      return [block.title ?? "", block.text];
    case "summary":
    case "tip":
    case "warning":
      return [block.title, block.text];
    case "table":
      return [block.caption ?? "", ...block.headers, ...block.rows.flat()];
    case "comparison":
      return [block.title ?? "", ...block.headers, ...block.rows.flat()];
    case "checklist":
      return [block.title ?? "", ...block.items.flatMap((i) => [i.text, i.detail ?? ""])];
    case "steps":
      return [block.title ?? "", ...block.steps.flatMap((s) => [s.title, s.description])];
    case "example":
    case "badExample":
    case "goodExample":
      return [block.title, block.explanation];
    case "decisionTree":
      return [
        block.title,
        block.description ?? "",
        ...block.nodes.flatMap((n) => [n.condition, n.recommendation, n.alternative ?? ""]),
      ];
    case "diagram":
      return [block.title, block.description ?? ""];
    case "faq":
      return block.faqs.flatMap((f) => [f.question, f.answer]);
    default:
      return [];
  }
}

export function countBlockWords(blocks: ContentBlock[] | undefined): number {
  if (!blocks) return 0;
  return blocks.reduce((sum, b) => sum + blockText(b).reduce((s, t) => s + countWords(t), 0), 0);
}

export function readingTimeFor(blocks: ContentBlock[] | undefined): string {
  const minutes = Math.max(1, Math.round(countBlockWords(blocks) / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}
