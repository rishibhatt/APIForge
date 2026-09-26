import type { Article, FAQItem } from "@/content/types";
import { CANONICAL_AUTHOR } from "@/lib/content/author";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "APIForge",
    "url": SITE_URL,
    "logo": `${SITE_URL}/icon.png`,
    "description": "APIForge is an AI-native API quality, testing, and OpenAPI/Swagger analysis workbench.",
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
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/resources/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateSoftwareApplicationJsonLd(name: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": `APIForge — ${name}`,
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

export function generateArticleJsonLd(article: Article) {
  const canonicalUrl = `${SITE_URL}/guides/${article.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": article.title,
    "description": article.description,
    "image": article.heroImage || `${SITE_URL}/api/og?type=guide&slug=${article.slug}`,
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
        "url": `${SITE_URL}/icon.png`,
      },
    },
    "keywords": article.keywords.join(", "),
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
