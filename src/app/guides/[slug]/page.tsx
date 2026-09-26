import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuideBySlug, getAllGuides } from "@/lib/content/loader";
import { createArticleMetadata } from "@/lib/seo/metadata";
import { generateArticleJsonLd, generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import ArticleLayout from "@/components/content/ArticleLayout";

export async function generateStaticParams() {
  return getAllGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const guide = getGuideBySlug(params.slug);
  if (!guide) return {};
  return createArticleMetadata(guide);
}

export default function GuideDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const guide = getGuideBySlug(params.slug);
  if (!guide) {
    notFound();
  }

  const articleJsonLd = generateArticleJsonLd(guide);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Guides", url: "/guides" },
    { name: guide.title, url: `/guides/${guide.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ArticleLayout article={guide} />
    </>
  );
}
