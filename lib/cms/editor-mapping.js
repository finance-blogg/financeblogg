import { SUMMARY_COLUMNS, normaliseSources, toIstDate } from "./mappers.js";
import { extractHeadings, textStats } from "./headings.js";

/** Columns the dashboard reads (everything except the search vector). */
export const ADMIN_ARTICLE_COLUMNS = `${SUMMARY_COLUMNS},body,sources,review_notes,editorial_notes,first_published_at,created_at,deleted_at,source_type`;

export const ADMIN_LIST_COLUMNS =
  "id,slug,title,status,category_slug,author_slug,published_at,first_published_at,updated_at,deleted_at,featured,fact_check_status,source_type";

export const EMPTY_EDITOR_VALUES = {
  title: "",
  slug: "",
  subtitle: "",
  excerpt: "",
  body: "",
  featuredImageUrl: "",
  featuredImageAlt: "",
  featuredImageWidth: null,
  featuredImageHeight: null,
  featuredImageCredit: "",
  categorySlug: "",
  authorSlug: "",
  tags: "",
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
  updatedOn: "",
  featured: false,
  sources: [],
  factCheckStatus: "pending",
  reviewedBy: "",
  reviewedOn: "",
  reviewNotes: "",
  editorialNotes: "",
};

export function rowToEditorValues(row) {
  return {
    title: row.title || "",
    slug: row.slug || "",
    subtitle: row.subtitle || "",
    excerpt: row.excerpt || "",
    body: row.body || "",
    featuredImageUrl: row.featured_image_url || "",
    featuredImageAlt: row.featured_image_alt || "",
    featuredImageWidth: row.featured_image_width || null,
    featuredImageHeight: row.featured_image_height || null,
    featuredImageCredit: row.featured_image_credit || "",
    categorySlug: row.category_slug || "",
    authorSlug: row.author_slug || "",
    tags: (row.tags || []).join(", "),
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    canonicalUrl: row.canonical_url || "",
    updatedOn: row.updated_on || "",
    featured: Boolean(row.featured),
    sources: normaliseSources(row.sources),
    factCheckStatus: row.fact_check_status === "verified" ? "verified" : "pending",
    reviewedBy: row.reviewed_by || "",
    reviewedOn: row.reviewed_on || "",
    reviewNotes: row.review_notes || "",
    editorialNotes: row.editorial_notes || "",
  };
}

export function rowToEditorMeta(row) {
  return {
    id: row.id,
    status: row.status,
    slug: row.slug,
    publishedAt: row.published_at || null,
    firstPublishedAt: row.first_published_at || null,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    deletedAt: row.deleted_at || null,
    sourceType: row.source_type || "cms",
  };
}

/** Validated editor data → database columns. Status and dates are set by the caller. */
export function editorDataToRow(data) {
  return {
    title: data.title,
    slug: data.slug,
    subtitle: data.subtitle,
    excerpt: data.excerpt,
    body: data.body,
    featured_image_url: data.featuredImageUrl || null,
    featured_image_alt: data.featuredImageAlt,
    featured_image_width: data.featuredImageUrl ? data.featuredImageWidth : null,
    featured_image_height: data.featuredImageUrl ? data.featuredImageHeight : null,
    featured_image_credit: data.featuredImageCredit,
    category_slug: data.categorySlug || null,
    author_slug: data.authorSlug || null,
    tags: data.tags,
    seo_title: data.seoTitle,
    seo_description: data.seoDescription,
    canonical_url: data.canonicalUrl || null,
    updated_on: data.updatedOn || null,
    featured: data.featured,
    sources: data.sources,
    fact_check_status: data.factCheckStatus,
    reviewed_by: data.reviewedBy || null,
    reviewed_on: data.reviewedOn || null,
    review_notes: data.reviewNotes,
    editorial_notes: data.editorialNotes,
    reading_minutes: data.readingMinutes,
    word_count: data.wordCount,
  };
}

/** Editor data → the article shape used by ArticleView, for previews of unsaved changes. */
export function editorDataToArticle(data, { status = "draft", publishedAt = null } = {}) {
  const body = data.body || "";
  const stats = textStats(body);
  return {
    source: "cms",
    slug: data.slug || "untitled",
    title: data.title,
    subtitle: data.subtitle || "",
    description: data.excerpt || data.seoDescription || "",
    category: data.categorySlug || null,
    author: data.authorSlug || null,
    date: publishedAt ? toIstDate(publishedAt) : null,
    updated: data.updatedOn || null,
    publishedAt,
    status,
    featured: Boolean(data.featured),
    image: data.featuredImageUrl
      ? {
          src: data.featuredImageUrl,
          alt: data.featuredImageAlt || "",
          width: data.featuredImageWidth || 1200,
          height: data.featuredImageHeight || 630,
          credit: data.featuredImageCredit || "",
        }
      : null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    review: {
      factCheck: data.factCheckStatus === "verified" ? "verified" : "pending",
      reviewedBy: data.reviewedBy || null,
      reviewedOn: data.reviewedOn || null,
      notes: [],
    },
    readingMinutes: stats.readingMinutes,
    wordCount: stats.wordCount,
    seo: { title: data.seoTitle || "", description: data.seoDescription || "", canonical: data.canonicalUrl || "" },
    bodyFormat: "markdown",
    body,
    sources: normaliseSources(data.sources),
    headings: extractHeadings(body),
  };
}
