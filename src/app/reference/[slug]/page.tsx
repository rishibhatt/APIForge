import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReferenceBySlug, getAllReferences } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import ArticleLayout from "@/components/content/ArticleLayout";

export async function generateStaticParams() {
  return getAllReferences().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const item = getReferenceBySlug(params.slug);
  if (!item) return {};
  return createBaseMetadata({
    title: `${item.title} | APIForge Reference`,
    description: item.description,
    path: `/reference/${item.slug}`,
    category: item.category,
    keywords: item.keywords || [],
    ogImageParams: {
      type: "reference",
      slug: item.slug,
    },
  });
}

export default function ReferenceDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const item = getReferenceBySlug(params.slug);
  if (!item) {
    notFound();
  }

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Reference", url: "/reference" },
    { name: item.title, url: `/reference/${item.slug}` },
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
