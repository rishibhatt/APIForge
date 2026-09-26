import type { MetadataRoute } from "next";
import { getAllGuides, getAllGlossary, getAllExamples, getAllComparisons } from "@/lib/content/loader";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/roast-my-api`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/api-score`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/openapi-validator`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/swagger-validator`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/api-quality-checker`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/api-testing`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/guides`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/examples`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const guideRoutes: MetadataRoute.Sitemap = getAllGuides().map((g) => ({
    url: `${baseUrl}/guides/${g.slug}`,
    lastModified: g.updatedAt ? new Date(g.updatedAt) : lastModified,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const glossaryRoutes: MetadataRoute.Sitemap = getAllGlossary().map((e) => ({
    url: `${baseUrl}/glossary/${e.slug}`,
    lastModified: e.updatedAt ? new Date(e.updatedAt) : lastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const exampleRoutes: MetadataRoute.Sitemap = getAllExamples().map((ex) => ({
    url: `${baseUrl}/examples/${ex.slug}`,
    lastModified: ex.updatedAt ? new Date(ex.updatedAt) : lastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const comparisonRoutes: MetadataRoute.Sitemap = getAllComparisons().map((c) => ({
    url: `${baseUrl}/compare/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...guideRoutes,
    ...glossaryRoutes,
    ...exampleRoutes,
    ...comparisonRoutes,
  ];
}
