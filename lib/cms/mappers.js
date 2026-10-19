import { extractHeadings } from "./headings";

/** Public columns only. Private columns are not granted to the anon role. */
export const SUMMARY_COLUMNS = [
  "id",
  "slug",
  "title",
  "subtitle",
  "excerpt",
  "featured_image_url",
  "featured_image_alt",
  "featured_image_width",
  "featured_image_height",
  "featured_image_credit",
  "category_slug",
  "author_slug",
  "tags",
  "status",
  "published_at",
  "updated_on",
  "updated_at",
  "featured",
  "fact_check_status",
  "reviewed_by",
  "reviewed_on",
  "reading_minutes",
  "word_count",
  "seo_title",
  "seo_description",
  "canonical_url",
].join(",");

export const ARTICLE_COLUMNS = `${SUMMARY_COLUMNS},body,sources`;

const istDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** A timestamp as a YYYY-MM-DD date in Indian Standard Time, matching MDX frontmatter dates. */
export function toIstDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : istDate.format(date);
}

export function normaliseSources(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s) => s && typeof s.title === "string" && typeof s.url === "string" && /^https:\/\//.test(s.url))
    .map((s) => ({
      title: s.title,
      publisher: typeof s.publisher === "string" ? s.publisher : "",
      url: s.url,
      note: typeof s.note === "string" ? s.note : "",
    }));
}

export function mapDbSummary(row) {
  return {
    source: "cms",
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || "",
    description: row.excerpt || row.seo_description || "",
    category: row.category_slug || null,
    author: row.author_slug || null,
    date: toIstDate(row.published_at),
    updated: row.updated_on || null,
    publishedAt: row.published_at || null,
    status: row.status,
    featured: Boolean(row.featured),
    image: row.featured_image_url
      ? {
          src: row.featured_image_url,
          alt: row.featured_image_alt || "",
          width: row.featured_image_width || 1200,
          height: row.featured_image_height || 630,
          credit: row.featured_image_credit || "",
        }
      : null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    review: {
      factCheck: row.fact_check_status === "verified" ? "verified" : "pending",
      reviewedBy: row.reviewed_by || null,
      reviewedOn: row.reviewed_on || null,
      notes: [],
    },
    readingMinutes: row.reading_minutes || 1,
    wordCount: row.word_count || 0,
    seo: {
      title: row.seo_title || "",
      description: row.seo_description || "",
      canonical: row.canonical_url || "",
    },
  };
}

export function mapDbArticle(row) {
  const body = row.body || "";
  return {
    ...mapDbSummary(row),
    bodyFormat: "markdown",
    body,
    sources: normaliseSources(row.sources),
    headings: extractHeadings(body),
  };
}

export function mapDbCategory(row) {
  return {
    slug: row.slug,
    name: row.name,
    shortName: row.short_name || row.name,
    description: row.description || "",
  };
}

export function mapDbAuthor(row) {
  return {
    slug: row.slug,
    name: row.name,
    role: row.role || "",
    bio: row.bio || "",
    expertise: Array.isArray(row.expertise) ? row.expertise : [],
    credentials: Array.isArray(row.credentials) ? row.credentials : [],
    links: row.links && typeof row.links === "object" ? row.links : {},
    image: row.image_url || null,
    isOrganization: Boolean(row.is_organization),
  };
}
