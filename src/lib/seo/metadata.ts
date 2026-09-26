import type { Metadata } from "next";
import type { Article, GlossaryEntry, OpenApiExample, Comparison } from "@/content/types";
import { CANONICAL_AUTHOR } from "@/lib/content/author";

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";

export interface MetadataOptions {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
  publishedAt?: string;
  updatedAt?: string;
  authorName?: string;
  category?: string;
  keywords?: string[];
  ogImageParams?: Record<string, string>;
}

export function createBaseMetadata({
  title,
  description,
  path,
  ogType = "website",
  publishedAt,
  updatedAt,
  authorName = CANONICAL_AUTHOR.name,
  category,
  keywords = [],
  ogImageParams = {},
}: MetadataOptions): Metadata {
  const canonicalUrl = `${DEFAULT_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  
  // Construct dynamic OG image URL
  const searchParams = new URLSearchParams();
  searchParams.set("title", title);
  if (category) searchParams.set("category", category);
  for (const [k, v] of Object.entries(ogImageParams)) {
    searchParams.set(k, v);
  }
  const ogImageUrl = `/api/og?${searchParams.toString()}`;

  return {
    title,
    description,
    keywords: [
      "APIForge",
      "OpenAPI",
      "Swagger",
      "API Quality",
      "REST API",
      ...keywords,
    ],
    authors: [{ name: authorName, url: CANONICAL_AUTHOR.website }],
    creator: authorName,
    publisher: "APIForge",
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
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
      type: ogType,
      locale: "en_US",
      url: canonicalUrl,
      siteName: "APIForge",
      title,
      description,
      publishedTime: publishedAt,
      modifiedTime: updatedAt || publishedAt,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@Rishi_o07",
      site: "@Rishi_o07",
      images: [ogImageUrl],
    },
  };
}

export function createArticleMetadata(article: Article): Metadata {
  return createBaseMetadata({
    title: `${article.title} — APIForge Guide`,
    description: article.description,
    path: `/guides/${article.slug}`,
    ogType: "article",
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    category: article.category,
    keywords: article.keywords,
    ogImageParams: {
      type: "guide",
      slug: article.slug,
    },
  });
}

export function createGlossaryMetadata(entry: GlossaryEntry): Metadata {
  return createBaseMetadata({
    title: `What is ${entry.term}? API Terms & Definitions — APIForge Glossary`,
    description: entry.definition,
    path: `/glossary/${entry.slug}`,
    category: entry.category,
    keywords: [entry.term, "API Glossary", "API definition", ...entry.commonMistakes],
    ogImageParams: {
      type: "glossary",
      term: entry.term,
    },
  });
}

export function createExampleMetadata(example: OpenApiExample): Metadata {
  return createBaseMetadata({
    title: `${example.title} — OpenAPI & Swagger Code Examples | APIForge`,
    description: example.description,
    path: `/examples/${example.slug}`,
    category: example.category,
    keywords: [example.title, "OpenAPI Example", "Swagger Spec Example"],
    ogImageParams: {
      type: "example",
      slug: example.slug,
    },
  });
}

export function createComparisonMetadata(comparison: Comparison): Metadata {
  return createBaseMetadata({
    title: `${comparison.title} — Factual Developer Comparison | APIForge`,
    description: comparison.description,
    path: `/compare/${comparison.slug}`,
    keywords: [`APIForge vs ${comparison.competitorName}`, comparison.competitorName, "API Tools Comparison"],
    ogImageParams: {
      type: "comparison",
      versus: comparison.competitorName,
    },
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
    keywords: [toolName, ...keywords],
    ogImageParams: {
      type: "tool",
      name: toolName,
    },
  });
}
