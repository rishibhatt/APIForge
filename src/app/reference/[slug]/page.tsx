import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReferenceBySlug, getAllReferences } from "@/lib/content/loader";
import { createBaseMetadata } from "@/lib/seo/metadata";
import { generateArticleJsonLd, generateBreadcrumbJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonld";
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
    title: item.title,
    description: item.description,
    path: `/reference/${item.slug}`,
    ogType: "article",
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    ogLabel: "Reference",
    keywords: item.keywords || [],
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

  const articleJsonLd = generateArticleJsonLd(item, "reference");
  const faqJsonLd = generateFaqJsonLd(item.faqs);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Reference", url: "/reference" },
    { name: item.title, url: `/reference/${item.slug}` },
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
