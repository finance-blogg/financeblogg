import { absoluteUrl, siteConfig } from "./site.js";
import { toIsoDate } from "./format.js";

/**
 * Builds page metadata with a canonical URL and matching Open Graph tags.
 * `path` must be the clean, canonical path for the page (e.g. "/about").
 * `canonical` overrides it with a full URL (for content first published elsewhere).
 */
export function pageMetadata({ title, description, path, canonical, noIndex = false, ogType = "website", images }) {
  const url = canonical || absoluteUrl(path);
  const socialTitle = typeof title === "string" ? title : title.absolute;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: ogType,
      url,
      title: socialTitle,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl("/logo.png"),
    ...(siteConfig.contactEmail
      ? { contactPoint: { "@type": "ContactPoint", email: siteConfig.contactEmail, contactType: "editorial" } }
      : {}),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: siteConfig.language,
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

function personOrOrg(author) {
  return {
    "@type": author.isOrganization ? "Organization" : "Person",
    name: author.name,
    url: absoluteUrl(`/authors/${author.slug}`),
  };
}

/** Publication and modification times in ISO 8601, preferring exact database timestamps. */
export function articleDates(article) {
  const published = article.publishedAt || toIsoDate(article.date);
  const modified = article.updated ? toIsoDate(article.updated) : published;
  return { published, modified: modified && published && Date.parse(modified) < Date.parse(published) ? published : modified };
}

export function articleJsonLd(article, author, category) {
  const url = absoluteUrl(`/blog/${article.slug}`);
  const { published, modified } = articleDates(article);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.seo?.title || article.title,
    description: article.seo?.description || article.description,
    image: [absoluteUrl(`/blog/${article.slug}/opengraph-image`)],
    datePublished: published,
    dateModified: modified,
    author: author ? [personOrOrg(author)] : undefined,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: category ? category.name : undefined,
    keywords: article.tags?.length ? article.tags.join(", ") : undefined,
    wordCount: article.wordCount || undefined,
    timeRequired: article.readingMinutes ? `PT${article.readingMinutes}M` : undefined,
    inLanguage: siteConfig.language,
    isAccessibleForFree: true,
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
  };
}

/** Visible FAQ blocks must match this structured data (Google rich-result requirement). */
export function faqPageJsonLd(faqs) {
  const items = Array.isArray(faqs) ? faqs.filter((f) => f?.question && f?.answer) : [];
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/**
 * Collection / listing pages. Pass `{ name, url }` items in display order.
 * `listPath` is the canonical path of the listing page (e.g. "/blog").
 */
export function itemListJsonLd({ name, description, listPath, items }) {
  const list = Array.isArray(items) ? items.filter((i) => i?.name && i?.url) : [];
  if (!list.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(listPath),
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: list.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: item.url.startsWith("http") ? item.url : absoluteUrl(item.url),
      })),
    },
  };
}
