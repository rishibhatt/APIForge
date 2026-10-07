import type { Metadata } from "next";
import type { Article, GlossaryEntry, OpenApiExample, Comparison } from "@/content/types";
import { CANONICAL_AUTHOR } from "@/lib/content/author";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";

/** Suffix the root layout's `title.template` ("%s | APIForge") appends. */
const BRAND_SUFFIX = " | APIForge";
const MAX_TITLE_LENGTH = 60;
const MIN_DESCRIPTION_LENGTH = 140;
const MAX_DESCRIPTION_LENGTH = 160;

/**
 * Page titles passed to these helpers must NOT include the brand; the root
 * layout template appends " | APIForge". When the branded title would exceed
 * ~60 chars, the bare title is emitted as `absolute` so the template is skipped
 * instead of producing an overlong title. Titles that already name APIForge are
 * also emitted as `absolute` to avoid "APIForge | APIForge".
 */
export function resolveTitle(title: string): Metadata["title"] {
  if (title.includes("APIForge")) return { absolute: title };
  return title.length + BRAND_SUFFIX.length <= MAX_TITLE_LENGTH ? title : { absolute: title };
}

/**
 * Keeps meta descriptions within 140–160 chars without touching source content:
 * short ones get a contextual tail appended (if it fits), long ones are cut at a
 * word boundary.
 */
export function normalizeDescription(description: string, tail?: string): string {
  let text = description.trim().replace(/\s+/g, " ");
  if (text.length < MIN_DESCRIPTION_LENGTH && tail) {
    const withTail = `${/[.!?]$/.test(text) ? text : `${text}.`} ${tail}`;
    if (withTail.length <= MAX_DESCRIPTION_LENGTH) text = withTail;
  }
  if (text.length > MAX_DESCRIPTION_LENGTH) {
    const cut = text.slice(0, MAX_DESCRIPTION_LENGTH - 1);
    const lastSpace = cut.lastIndexOf(" ");
    text = `${cut.slice(0, lastSpace > 100 ? lastSpace : cut.length).replace(/[\s,;:—–-]+$/, "")}…`;
  }
  return text;
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Dynamic OG card URL rendered by `src/app/api/og/route.tsx`. */
export function ogImageUrl(title: string, type?: string): string {
  const params = new URLSearchParams({ title });
  if (type) params.set("type", type);
  return `${SITE_URL}/api/og?${params.toString()}`;
}

export interface MetadataOptions {
  /** Page title WITHOUT the "| APIForge" brand suffix. */
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
  publishedAt?: string;
  updatedAt?: string;
  authorName?: string;
  /** Short label shown on the OG card (e.g. "Guide", "Tool"). */
  ogLabel?: string;
  /** Tail appended to descriptions shorter than 140 chars. */
  descriptionTail?: string;
  keywords?: string[];
  noindex?: boolean;
}

export function createBaseMetadata({
  title,
  description,
  path,
  ogType = "website",
  publishedAt,
  updatedAt,
  authorName = CANONICAL_AUTHOR.name,
  ogLabel,
  descriptionTail = "Free, in-browser OpenAPI and Swagger tooling from APIForge.",
  keywords = [],
  noindex = false,
}: MetadataOptions): Metadata {
  const canonicalUrl = absoluteUrl(path);
  const metaDescription = normalizeDescription(description, descriptionTail);
  const image = ogImageUrl(title, ogLabel);

  return {
    title: resolveTitle(title),
    description: metaDescription,
    keywords: ["APIForge", "OpenAPI", "Swagger", ...keywords],
    authors: [{ name: authorName, url: CANONICAL_AUTHOR.website }],
    creator: authorName,
    publisher: "APIForge",
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noindex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      ...(ogType === "article"
        ? {
            type: "article" as const,
            publishedTime: publishedAt,
            modifiedTime: updatedAt || publishedAt,
            authors: [authorName],
          }
        : { type: "website" as const }),
      locale: "en_US",
      url: canonicalUrl,
      siteName: "APIForge",
      title,
      description: metaDescription,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images: [image],
    },
  };
}

export function createArticleMetadata(article: Article): Metadata {
  return createBaseMetadata({
    title: article.title,
    description: article.description,
    path: `/guides/${article.slug}`,
    ogType: "article",
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    ogLabel: "Guide",
    descriptionTail: "A practical guide from APIForge.",
    keywords: article.primaryKeyword
      ? [article.primaryKeyword, ...(article.keywords ?? [])]
      : article.keywords,
  });
}

export function createGlossaryMetadata(entry: GlossaryEntry): Metadata {
  return createBaseMetadata({
    title: `What is ${entry.term}? API Glossary`,
    description: entry.definition,
    path: `/glossary/${entry.slug}`,
    ogType: "article",
    publishedAt: entry.publishedAt,
    updatedAt: entry.updatedAt,
    ogLabel: "Glossary",
    descriptionTail: "Definition, examples and common mistakes.",
    keywords: [entry.term, "API glossary", "API definition"],
  });
}

export function createExampleMetadata(example: OpenApiExample): Metadata {
  return createBaseMetadata({
    title: example.title,
    description: example.description,
    path: `/examples/${example.slug}`,
    ogType: "article",
    publishedAt: example.publishedAt,
    updatedAt: example.updatedAt,
    ogLabel: "Example",
    descriptionTail: "Copy-ready YAML with notes on what to fix and why.",
    keywords: [example.title, "OpenAPI example", "Swagger spec example"],
  });
}

export function createComparisonMetadata(comparison: Comparison): Metadata {
  return createBaseMetadata({
    title: comparison.title,
    description: comparison.description,
    path: `/compare/${comparison.slug}`,
    ogType: "article",
    publishedAt: comparison.publishedAt,
    updatedAt: comparison.updatedAt,
    ogLabel: "Comparison",
    descriptionTail: `A factual feature comparison with ${comparison.competitorName}.`,
    keywords: [`APIForge vs ${comparison.competitorName}`, comparison.competitorName, "API tools comparison"],
  });
}

export function createToolMetadata(
  toolName: string,
  title: string,
  description: string,
  path: string,
  keywords: string[] = []
): Metadata {
  return createBaseMetadata({
    title,
    description,
    path,
    ogLabel: "Tool",
    keywords: [toolName, ...keywords],
  });
}
