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
