import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getChecklistBySlug, getAllChecklists } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateArticleJsonLd, generateBreadcrumbJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonld";
import ArticleLayout from "@/components/content/ArticleLayout";

export async function generateStaticParams() {
  return getAllChecklists().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const item = getChecklistBySlug(params.slug);
  if (!item) return {};
  return createBaseMetadata({
    title: item.title,
    description: item.description,
    path: `/checklists/${item.slug}`,
    ogType: "article",
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    ogLabel: "Checklist",
    keywords: item.keywords || [],
  });
}

export default function ChecklistDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const item = getChecklistBySlug(params.slug);
  if (!item) {
    notFound();
  }

  const articleJsonLd = generateArticleJsonLd(item, "checklists");
  const faqJsonLd = generateFaqJsonLd(item.faqs);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Checklists", url: "/checklists" },
    { name: item.title, url: `/checklists/${item.slug}` },
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
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <ArticleLayout article={item} />
    </>
  );
}
