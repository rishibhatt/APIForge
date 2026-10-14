import type { Article, FAQItem } from "@/content/types";
import { CANONICAL_AUTHOR } from "@/lib/content/author";
import { SITE_URL } from "@/lib/seo/metadata";

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "APIForge",
    "url": SITE_URL,
    "logo": `${SITE_URL}/apple-icon`,
    "description": "APIForge is a free, browser-based workspace to parse, test, score and generate from OpenAPI and Swagger specs.",
    "founder": {
      "@type": "Person",
      "name": CANONICAL_AUTHOR.name,
      "url": CANONICAL_AUTHOR.website,
      "sameAs": [
        CANONICAL_AUTHOR.github,
        CANONICAL_AUTHOR.linkedin,
        CANONICAL_AUTHOR.x,
      ].filter(Boolean),
    },
    "sameAs": [
      "https://github.com/rishibhatt/APIForge",
      CANONICAL_AUTHOR.x,
    ].filter(Boolean),
  };
}

export function generateWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "APIForge",
    "url": SITE_URL,
    "description": "Parse, test, score and generate from any OpenAPI or Swagger spec.",
    "inLanguage": "en",
    "publisher": { "@type": "Organization", "name": "APIForge", "url": SITE_URL },
  };
}

export function generateSoftwareApplicationJsonLd(name: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": name === "APIForge" ? name : `APIForge ${name}`,
    "operatingSystem": "Web",
    "applicationCategory": "DeveloperApplication",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD",
    },
    "description": description,
    "url": `${SITE_URL}${path}`,
    "author": {
      "@type": "Organization",
      "name": "APIForge",
      "url": SITE_URL,
    },
  };
}

export function generatePersonJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": CANONICAL_AUTHOR.name,
    "jobTitle": CANONICAL_AUTHOR.role,
    "url": CANONICAL_AUTHOR.website,
    "sameAs": [
      CANONICAL_AUTHOR.github,
      CANONICAL_AUTHOR.linkedin,
      CANONICAL_AUTHOR.x,
    ].filter(Boolean),
    "worksFor": {
      "@type": "Organization",
      "name": "APIForge",
      "url": SITE_URL,
    },
  };
}

export function generateBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

const SECTION_LABELS: Record<string, string> = {
  guides: "Guide",
  checklists: "Checklist",
  reference: "Reference",
};

export function generateArticleJsonLd(article: Article, section = "guides") {
  const canonicalUrl = `${SITE_URL}/${section}/${article.slug}`;
  const ogImage = `${SITE_URL}/api/og?${new URLSearchParams({ title: article.title, type: SECTION_LABELS[section] ?? "Guide" }).toString()}`;
  const heroImage = article.heroImage
    ? article.heroImage.startsWith("http")
      ? article.heroImage
      : `${SITE_URL}${article.heroImage.startsWith("/") ? "" : "/"}${article.heroImage}`
    : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": article.title,
    "description": article.description,
    "image": heroImage || ogImage,
    "url": canonicalUrl,
    "datePublished": article.publishedAt,
    "dateModified": article.updatedAt || article.publishedAt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    "author": {
      "@type": "Person",
      "name": CANONICAL_AUTHOR.name,
      "url": CANONICAL_AUTHOR.website,
    },
    "publisher": {
      "@type": "Organization",
      "name": "APIForge",
      "url": SITE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/apple-icon`,
      },
    },
    "keywords": (article.keywords || article.tags || []).join(", ") || undefined,
  };
}

export function generateFaqJsonLd(faqs?: FAQItem[]) {
  if (!faqs || faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
}
