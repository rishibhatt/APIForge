import type { ContentType } from "@/content/types";

const WORDS: Record<string, string> = {
  api: "API",
  apis: "APIs",
  openapi: "OpenAPI",
  rest: "REST",
  http: "HTTP",
  json: "JSON",
  swagger: "Swagger",
  oauth: "OAuth",
};

/** "api-security" -> "API security", "rest-api" -> "REST API", "developer-experience" -> "Developer experience". */
export function formatLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word, i) => WORDS[word] ?? (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export const TYPE_LABELS: Record<ContentType, string> = {
  guide: "Guides",
  glossary: "Glossary",
  example: "Examples",
  comparison: "Compare",
  checklist: "Checklists",
  reference: "Reference",
  "tool-guide": "Guides",
};

/** Same id derivation ArticleContent uses for heading anchors. */
export function headingAnchor(text: string, id?: string): string {
  return id || text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** "2026-05-01" -> "May 1, 2026"; returns the input unchanged if it is not a date. */
export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Newest first: updatedAt, then publishedAt, then title. Shared by the guides index and prev/next links. */
export function byNewest<T extends { updatedAt?: string; publishedAt: string; title: string }>(a: T, b: T): number {
  const au = a.updatedAt ?? a.publishedAt;
  const bu = b.updatedAt ?? b.publishedAt;
  if (au !== bu) return au < bu ? 1 : -1;
  if (a.publishedAt !== b.publishedAt) return a.publishedAt < b.publishedAt ? 1 : -1;
  return a.title.localeCompare(b.title);
}

export const TYPE_PATHS: Record<ContentType, string> = {
  guide: "/guides",
  glossary: "/glossary",
  example: "/examples",
  comparison: "/compare",
  checklist: "/checklists",
  reference: "/reference",
  "tool-guide": "/guides",
};
