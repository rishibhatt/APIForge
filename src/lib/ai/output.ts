import { NOT_SPECIFIED } from "./operation-context";

/** Post-processors that turn raw model text into the exact output formats we promise. */

function stripThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s\S]*?<\/think>/i, "")
    .trim();
}

const TS_LANGS = new Set(["typescript", "ts", "tsx", "javascript", "js", ""]);
const CODE_START = /^(export\s|import\s|interface\s|type\s|enum\s|declare\s|const\s|let\s|async\s|function\s|\/\*\*|\/\/|\/\*)/;

/**
 * Returns exactly ONE ```typescript fenced block. Joins several fenced blocks, drops surrounding
 * prose, and when the model forgot fences keeps from the first code-looking line.
 */
export function extractTypeScriptBlock(raw: string): string {
  const text = stripThinking(raw).replace(/\r\n?/g, "\n");
  const blocks: string[] = [];
  const re = /```([A-Za-z0-9_-]*)[^\n]*\n([\s\S]*?)(?:```|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (TS_LANGS.has(m[1]!.toLowerCase()) && m[2]!.trim()) blocks.push(m[2]!.trimEnd());
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  let code: string;
  if (blocks.length > 0) {
    code = blocks.join("\n\n");
  } else {
    const lines = text.split("\n");
    const start = lines.findIndex((l) => CODE_START.test(l.trim()));
    if (start < 0) return "```typescript\n// No TypeScript could be generated for this operation.\n```";
    let end = lines.length;
    while (end > start && !/[}\];)]\s*$|^\s*$/.test(lines[end - 1]!)) end--;
    code = lines.slice(start, end).join("\n").trim();
  }
  code = code.replace(/^\s*```\w*\s*$/gm, "").trim();
  return `\`\`\`typescript\n${code}\n\`\`\``;
}

export const PROMPT_SECTIONS = [
  { key: "task", heading: "# Task", match: /^task$/i },
  { key: "context", heading: "## Context", match: /^context$/i },
  { key: "contract", heading: "## Endpoint contract", match: /^endpoint contract/i },
  { key: "types", heading: "## Types", match: /^types?$/i },
  { key: "requirements", heading: "## Requirements", match: /^requirements?$/i },
  { key: "acceptance", heading: "## Acceptance criteria", match: /^acceptance criteria$/i },
] as const;

type SectionKey = (typeof PROMPT_SECTIONS)[number]["key"];

export interface PromptOverrides {
  /** Deterministic bodies that REPLACE whatever the model wrote (facts must not come from the model). */
  context?: string;
  contract?: string;
}

function splitSections(text: string): Partial<Record<SectionKey, string>> {
  const out: Partial<Record<SectionKey, string>> = {};
  let current: SectionKey | null = null;
  let buf: string[] = [];
  let inFence = false;
  const flush = () => {
    if (current) {
      const body = buf.join("\n").trim();
      out[current] = out[current] ? `${out[current]}\n\n${body}` : body;
    }
    buf = [];
  };
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const h = !inFence ? /^(#{1,2})\s+(.+?)\s*#*\s*$/.exec(line) : null;
    if (h) {
      const title = h[2]!.replace(/[*_`]/g, "").trim();
      const sec = PROMPT_SECTIONS.find((s) => s.match.test(title));
      if (sec) {
        flush();
        current = sec.key;
        continue;
      }
    }
    if (current) buf.push(line);
  }
  flush();
  return out;
}

/**
 * Normalises the AI-prompt output to the fixed markdown skeleton: strips preamble/outer fences,
 * orders the six sections, injects deterministic Context/Endpoint contract, and fills anything
 * missing with "Not specified in the spec".
 */
export function normalizePromptMarkdown(raw: string, overrides: PromptOverrides = {}): string {
  let text = stripThinking(raw).replace(/\r\n?/g, "\n").trim();
  // Remove an outer ```markdown fence wrapped around the whole answer (with or without preamble).
  const open = /^```(?:markdown|md)\s*$/im.exec(text);
  if (open) {
    text = (text.slice(0, open.index) + text.slice(open.index + open[0].length)).trim();
    text = text.replace(/\n```\s*$/, "").trim();
  }

  const parsed = splitSections(text);
  const parts: string[] = [];
  for (const sec of PROMPT_SECTIONS) {
    let body = parsed[sec.key]?.trim() ?? "";
    if (sec.key === "context" && overrides.context) body = overrides.context.trim();
    if (sec.key === "contract" && overrides.contract) body = overrides.contract.trim();
    if (sec.key === "task" && !body) body = NOT_SPECIFIED + ".";
    if (!body) body = `${NOT_SPECIFIED}.`;
    parts.push(`${sec.heading}\n\n${body}`);
  }
  return `${parts.join("\n\n")}\n`;
}
