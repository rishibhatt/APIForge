import type { MetadataRoute } from "next";
import {
  getAllGuides,
  getAllGlossary,
  getAllExamples,
  getAllComparisons,
  getAllChecklists,
  getAllReferences,
} from "@/lib/content/loader";

function toDate(value?: string): Date {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";
  const newest = (items: Array<{ updatedAt?: string; publishedAt?: string }>): Date =>
    items.reduce<Date>((max, i) => {
      const d = toDate(i.updatedAt || i.publishedAt);
      return d > max ? d : max;
    }, new Date(0));

  // Real dates only: bump SITE_PAGES_UPDATED when the home page, tool pages or About page change.
  const SITE_PAGES_UPDATED = new Date("2026-10-07");
  const listing = (items: Array<{ updatedAt?: string; publishedAt?: string }>): Date =>
    items.length > 0 ? newest(items) : SITE_PAGES_UPDATED;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: SITE_PAGES_UPDATED, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: SITE_PAGES_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/support`, lastModified: SITE_PAGES_UPDATED, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/roast-my-api`, lastModified: SITE_PAGES_UPDATED, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/api-score`, lastModified: SITE_PAGES_UPDATED, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/openapi-validator`, lastModified: SITE_PAGES_UPDATED, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/swagger-validator`, lastModified: SITE_PAGES_UPDATED, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/api-quality-checker`, lastModified: SITE_PAGES_UPDATED, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/api-testing`, lastModified: SITE_PAGES_UPDATED, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/guides`, lastModified: listing(getAllGuides()), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/glossary`, lastModified: listing(getAllGlossary()), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/examples`, lastModified: listing(getAllExamples()), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/compare`, lastModified: listing(getAllComparisons()), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/checklists`, lastModified: listing(getAllChecklists()), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/reference`, lastModified: listing(getAllReferences()), changeFrequency: "weekly", priority: 0.8 },
  ];

  const guideRoutes: MetadataRoute.Sitemap = getAllGuides().map((g) => ({
    url: `${baseUrl}/guides/${g.slug}`,
    lastModified: toDate(g.updatedAt || g.publishedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const glossaryRoutes: MetadataRoute.Sitemap = getAllGlossary().map((e) => ({
    url: `${baseUrl}/glossary/${e.slug}`,
    lastModified: toDate(e.updatedAt || e.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const exampleRoutes: MetadataRoute.Sitemap = getAllExamples().map((ex) => ({
    url: `${baseUrl}/examples/${ex.slug}`,
    lastModified: toDate(ex.updatedAt || ex.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const comparisonRoutes: MetadataRoute.Sitemap = getAllComparisons().map((c) => ({
    url: `${baseUrl}/compare/${c.slug}`,
    lastModified: toDate(c.updatedAt || c.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const checklistRoutes: MetadataRoute.Sitemap = getAllChecklists().map((ch) => ({
    url: `${baseUrl}/checklists/${ch.slug}`,
    lastModified: toDate(ch.updatedAt || ch.publishedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const referenceRoutes: MetadataRoute.Sitemap = getAllReferences().map((ref) => ({
    url: `${baseUrl}/reference/${ref.slug}`,
    lastModified: toDate(ref.updatedAt || ref.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...guideRoutes,
    ...glossaryRoutes,
    ...exampleRoutes,
    ...comparisonRoutes,
    ...checklistRoutes,
    ...referenceRoutes,
  ];
}
