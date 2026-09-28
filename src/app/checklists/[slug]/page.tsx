import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getChecklistBySlug, getAllChecklists } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
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
    title: `${item.title} | APIForge Checklist`,
    description: item.description,
    path: `/checklists/${item.slug}`,
    category: item.category,
    keywords: item.keywords || [],
    ogImageParams: {
      type: "checklist",
      slug: item.slug,
    },
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

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Checklists", url: "/checklists" },
    { name: item.title, url: `/checklists/${item.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ArticleLayout article={item} />
    </>
  );
}
