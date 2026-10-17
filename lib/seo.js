import { absoluteUrl, siteConfig } from "./site";
import { toIsoDate } from "./format";
import { getCategory } from "./categories";

/**
 * Builds page metadata with a canonical URL and matching Open Graph tags.
 * `path` must be the clean, canonical path for the page (e.g. "/about").
 */
export function pageMetadata({ title, description, path, noIndex = false, ogType = "website", images }) {
  const url = absoluteUrl(path);
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

export function articleJsonLd(article, author) {
  const url = absoluteUrl(`/blog/${article.slug}`);
  const category = getCategory(article.category);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: [absoluteUrl(`/blog/${article.slug}/opengraph-image`)],
    datePublished: toIsoDate(article.date),
    dateModified: toIsoDate(article.updated || article.date),
    author: [personOrOrg(author)],
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: category ? category.name : undefined,
    keywords: article.tags.length ? article.tags.join(", ") : undefined,
    inLanguage: siteConfig.language,
    isAccessibleForFree: true,
  };
}
