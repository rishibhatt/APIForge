# APIForge SEO & Search Engine Audit Guide

This document outlines the Search Engine Optimization (SEO) architecture, metadata system, sitemap generation, structured data, and audit tooling built into APIForge.

## Core Architecture

1. **Metadata System (`src/lib/seo/metadata.ts`)**
   - Implements `createArticleMetadata`, `createToolMetadata`, `createGlossaryMetadata`, `createComparisonMetadata`.
   - Guarantees unique title tags, description metas, canonical URLs, and OpenGraph parameters.

2. **OpenGraph & Social Sharing (`src/app/api/og/route.tsx`)**
   - Dynamic 1200x630 card generator utilizing Next.js `ImageResponse`.
   - Renders APIForge branding, category badges, title text, and site URL.

3. **Structured Data (JSON-LD) (`src/lib/seo/jsonld.ts`)**
   - Generates Schema.org entities for:
     - `Organization` (APIForge entity with founder reference)
     - `Person` (Rishab Bhatt developer profile)
     - `WebSite` & `SoftwareApplication`
     - `TechArticle` for guides
     - `BreadcrumbList` for category hierarchies
     - `FAQPage` for visible FAQs

4. **Sitemap & Robots Policy**
   - Dynamic sitemap (`src/app/sitemap.ts`) containing all static routes, tool pages, guides, glossary terms, code examples, and comparisons.
   - Robots policy (`src/app/robots.ts`) allowing Googlebot, Bingbot, OAI-SearchBot while disallowing internal API routes.

## Automated Verification

Run automated SEO & link audits using:

```bash
npm run seo:check
npm run content:check
```

## External Console Setup

To complete Search Engine Indexing:
1. **Google Search Console**: Submit `https://apiforge.info/sitemap.xml` under Sitemaps.
2. **Bing Webmaster Tools**: Import GSC settings or register `https://apiforge.info`.
3. **IndexNow**: Send automated URLs updates to Bing/Yandex on publish.
