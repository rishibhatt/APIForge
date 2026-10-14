/**
 * Small, safe markdown parser for assistant replies. It produces a plain AST that React renders as
 * elements, so no raw HTML is ever injected. Tolerant of half-finished input (streaming): an open
 * fence is a code block, an unfinished table row is a paragraph, a stray `**` stays literal text.
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "code"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "del"; c: Inline[] }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "br" };

export interface ListItem {
  inline: Inline[];
  children: ListBlock | null;
}

export interface ListBlock {
  t: "list";
  ordered: boolean;
  start: number;
  items: ListItem[];
}

export type Block =
  | { t: "heading"; level: 1 | 2 | 3 | 4; inline: Inline[] }
  | { t: "paragraph"; inline: Inline[] }
  | { t: "code"; lang: string; code: string; closed: boolean }
  | ListBlock
  | { t: "quote"; blocks: Block[] }
  | { t: "table"; head: Inline[][]; align: ("left" | "right" | "center" | null)[]; rows: Inline[][][] }
  | { t: "hr" };

/** Only absolute http(s) links are kept. Everything else renders as plain text. */
function safeHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const isWordChar = (c: string | undefined) => c != null && /[A-Za-z0-9]/.test(c);

function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let buf = "";
  const flush = () => {
    if (buf) {
      out.push({ t: "text", v: buf });
      buf = "";
    }
  };
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;

    if (ch === "\\" && i + 1 < src.length && /[\\`*_{}[\]()#+\-.!|~>]/.test(src[i + 1]!)) {
      buf += src[i + 1];
      i += 2;
      continue;
    }

    if (ch === "`") {
      let run = 1;
      while (src[i + run] === "`") run++;
      const fence = "`".repeat(run);
      const end = src.indexOf(fence, i + run);
      if (end > i + run) {
        flush();
        out.push({ t: "code", v: src.slice(i + run, end).replace(/^ (.*) $/, "$1") });
        i = end + run;
        continue;
      }
      buf += fence;
      i += run;
      continue;
    }

    if (ch === "*" || ch === "_" || ch === "~") {
      const double = src[i + 1] === ch;
      if (ch === "~" && !double) {
        buf += ch;
        i++;
        continue;
      }
      const len = double ? 2 : 1;
      const marker = ch.repeat(len);
      const prev = src[i - 1];
      const next = src[i + len];
      const opens = next != null && !/\s/.test(next) && !(ch === "_" && isWordChar(prev));
      if (opens) {
        let end = -1;
        let from = i + len;
        while (from < src.length) {
          const found = src.indexOf(marker, from);
          if (found === -1) break;
          const before = src[found - 1];
          const after = src[found + len];
          const closes =
            found > i + len &&
            before != null &&
            !/\s/.test(before) &&
            !(ch === "_" && isWordChar(after)) &&
            !(len === 1 && after === ch);
          if (closes) {
            end = found;
            break;
          }
          from = found + len;
        }
        if (end !== -1) {
          flush();
          const c = parseInline(src.slice(i + len, end));
          out.push(ch === "~" ? { t: "del", c } : len === 2 ? { t: "strong", c } : { t: "em", c });
          i = end + len;
          continue;
        }
      }
      buf += marker;
      i += len;
      continue;
    }

    if (ch === "[") {
      const close = findLinkClose(src, i);
      if (close) {
        const label = src.slice(i + 1, close.labelEnd);
        const href = safeHref(close.url);
        flush();
        if (href) out.push({ t: "link", href, c: parseInline(label) });
        else out.push(...parseInline(label));
        i = close.end;
        continue;
      }
    }

    if (ch === "\n") {
      flush();
      out.push({ t: "br" });
      i++;
      continue;
    }

    buf += ch;
    i++;
  }
  flush();
  return out;
}

function findLinkClose(src: string, start: number): { labelEnd: number; url: string; end: number } | null {
  let depth = 0;
  let j = start;
  for (; j < src.length; j++) {
    if (src[j] === "[") depth++;
    else if (src[j] === "]") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (j >= src.length || src[j + 1] !== "(") return null;
  const urlStart = j + 2;
  const urlEnd = src.indexOf(")", urlStart);
  if (urlEnd === -1) return null;
  const url = src.slice(urlStart, urlEnd).trim().split(/\s+/)[0] ?? "";
  return { labelEnd: j, url, end: urlEnd + 1 };
}

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const QUOTE = /^ {0,3}>\s?(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (s[i] === "|") {
      cells.push(cur.trim());
      cur = "";
    } else cur += s[i];
  }
  cells.push(cur.trim());
  return cells;
}

function isTableStart(lines: string[], i: number): boolean {
  const head = lines[i];
  const sep = lines[i + 1];
  return (
    head != null &&
    sep != null &&
    head.includes("|") &&
    sep.includes("-") &&
    TABLE_SEP.test(sep) &&
    splitRow(head).length >= 2
  );
}

function startsBlock(lines: string[], i: number): boolean {
  const l = lines[i]!;
  return (
    FENCE_OPEN.test(l) ||
    HEADING.test(l) ||
    HR.test(l) ||
    LIST_ITEM.test(l) ||
    QUOTE.test(l) ||
    isTableStart(lines, i)
  );
}

interface FlatItem {
  indent: number;
  ordered: boolean;
  start: number;
  text: string;
}

function buildList(items: FlatItem[]): ListBlock {
  const root: ListBlock = { t: "list", ordered: items[0]!.ordered, start: items[0]!.start, items: [] };
  const stack: { indent: number; list: ListBlock }[] = [{ indent: items[0]!.indent, list: root }];
  for (const it of items) {
    while (stack.length > 1 && it.indent < stack[stack.length - 1]!.indent) stack.pop();
    let top = stack[stack.length - 1]!;
    if (it.indent > top.indent) {
      const parent = top.list.items[top.list.items.length - 1];
      if (parent) {
        const child: ListBlock = { t: "list", ordered: it.ordered, start: it.start, items: [] };
        parent.children = child;
        top = { indent: it.indent, list: child };
        stack.push(top);
      }
    }
    top.list.items.push({ inline: parseInline(it.text), children: null });
  }
  return root;
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.trim() === "") {
      i++;
      continue;
    }

    const fence = FENCE_OPEN.exec(line);
    if (fence) {
      const marker = fence[1]!;
      const lang = (fence[2] ?? "").toLowerCase();
      const body: string[] = [];
      let closed = false;
      i++;
      while (i < lines.length) {
        const l = lines[i]!;
        const t = l.trim();
        if (t.startsWith(marker[0]!.repeat(marker.length)) && /^[`~]+$/.test(t)) {
          closed = true;
          i++;
          break;
        }
        body.push(l);
        i++;
      }
      blocks.push({ t: "code", lang, code: body.join("\n"), closed });
      continue;
    }

    const h = HEADING.exec(line);
    if (h) {
      const level = Math.min(4, h[1]!.length) as 1 | 2 | 3 | 4;
      blocks.push({ t: "heading", level, inline: parseInline(h[2]!) });
      i++;
      continue;
    }

    if (HR.test(line)) {
      blocks.push({ t: "hr" });
      i++;
      continue;
    }

    if (isTableStart(lines, i)) {
      const head = splitRow(lines[i]!).map(parseInline);
      const align = splitRow(lines[i + 1]!).map((c) => {
        const l = c.startsWith(":");
        const r = c.endsWith(":");
        return l && r ? "center" : r ? "right" : l ? "left" : null;
      });
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && lines[i]!.includes("|") && lines[i]!.trim() !== "") {
        const cells = splitRow(lines[i]!);
        while (cells.length < head.length) cells.push("");
        rows.push(cells.slice(0, head.length).map(parseInline));
        i++;
      }
      blocks.push({ t: "table", head, align, rows });
      continue;
    }

    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length) {
        const q = QUOTE.exec(lines[i]!);
        if (!q) break;
        inner.push(q[1]!);
        i++;
      }
      blocks.push({ t: "quote", blocks: parseMarkdown(inner.join("\n")) });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const flat: FlatItem[] = [];
      while (i < lines.length) {
        const l = lines[i]!;
        const m = LIST_ITEM.exec(l);
        if (m && !HR.test(l)) {
          const marker = m[2]!;
          flat.push({
            indent: m[1]!.replace(/\t/g, "    ").length,
            ordered: /\d/.test(marker),
            start: /\d/.test(marker) ? parseInt(marker, 10) : 1,
            text: m[3]!,
          });
          i++;
          continue;
        }
        // Blank line inside a list: keep going only if another item follows.
        if (l.trim() === "" && i + 1 < lines.length && LIST_ITEM.test(lines[i + 1]!)) {
          i++;
          continue;
        }
        // Indented continuation of the previous item.
        if (/^\s{2,}\S/.test(l) && flat.length > 0 && !startsBlock(lines, i)) {
          flat[flat.length - 1]!.text += `\n${l.trim()}`;
          i++;
          continue;
        }
        break;
      }
      blocks.push(buildList(flat));
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i]!.trim() !== "" && !startsBlock(lines, i)) {
      para.push(lines[i]!);
      i++;
    }
    blocks.push({ t: "paragraph", inline: parseInline(para.map((p) => p.trim()).join("\n")) });
  }

  return blocks;
}
