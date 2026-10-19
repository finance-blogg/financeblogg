import { isValidSlug, RESERVED_SLUGS, SLUG_MAX, SLUG_PATTERN } from "./slug.js";
import { textStats } from "./headings.js";

/**
 * Article validation shared by the server actions (authoritative) and the
 * editor (instant feedback). Drafts only need a title and a valid slug;
 * publishing and scheduling require complete metadata.
 */

export const LIMITS = {
  title: 200,
  subtitle: 300,
  excerpt: 400,
  excerptMin: 50,
  body: 200000,
  bodyMinWords: 150,
  imageAlt: 300,
  imageCredit: 300,
  seoTitle: 120,
  seoTitleIdeal: 65,
  seoDescription: 320,
  metaMin: 50,
  metaIdealMax: 170,
  tags: 20,
  tag: 40,
  sources: 30,
  reviewNotes: 5000,
  editorialNotes: 10000,
};

export const INTENTS = ["save", "publish", "schedule", "unpublish"];
const SCHEDULE_MIN_LEAD_MS = 60 * 1000;
const SCHEDULE_MAX_LEAD_MS = 366 * 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_IMAGE_PATTERN = /^\/images\/[A-Za-z0-9/_.-]+\.(png|jpe?g|webp|gif|avif|svg)$/i;

const istDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

function str(value, max) {
  const s = typeof value === "string" ? value : value == null ? "" : String(value);
  return max ? s.slice(0, max + 1) : s;
}

function singleLine(value, max) {
  return str(value, max).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function positiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 20000 ? n : null;
}

export function normaliseTags(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  const seen = new Set();
  const tags = [];
  for (const raw of list) {
    const tag = singleLine(raw, LIMITS.tag).slice(0, LIMITS.tag);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

export function isAllowedImageUrl(url, storagePrefix) {
  if (!url) return true;
  if (LOCAL_IMAGE_PATTERN.test(url) && !url.includes("..")) return true;
  return Boolean(storagePrefix) && url.startsWith(storagePrefix) && /^[A-Za-z0-9/_.%-]+$/.test(url.slice(storagePrefix.length));
}

function normaliseSources(value, errors) {
  if (!Array.isArray(value)) return [];
  const sources = [];
  value.slice(0, LIMITS.sources + 1).forEach((s, i) => {
    const source = {
      title: singleLine(s?.title, 300),
      publisher: singleLine(s?.publisher, 200),
      url: singleLine(s?.url, 1000),
      note: singleLine(s?.note, 500),
    };
    if (!source.title && !source.url && !source.publisher && !source.note) return;
    if (!source.title) errors[`sources.${i}.title`] = "Each source needs a title.";
    if (!/^https:\/\/[^\s]+\.[^\s]+$/.test(source.url)) errors[`sources.${i}.url`] = "Source links must be full https:// URLs.";
    sources.push(source);
  });
  if (sources.length > LIMITS.sources) errors.sources = `Use at most ${LIMITS.sources} sources.`;
  return sources.slice(0, LIMITS.sources);
}

/** Status the article will have after this action. */
export function targetStatus(intent, currentStatus) {
  if (intent === "publish") return "published";
  if (intent === "schedule") return "scheduled";
  if (intent === "unpublish") return "draft";
  return currentStatus || "draft";
}

/**
 * @param {object} input            Raw editor values (camelCase).
 * @param {object} options
 * @param {string} options.intent   One of INTENTS.
 * @param {string} [options.currentStatus]
 * @param {string[]} options.categories  Valid category slugs.
 * @param {string[]} options.authors     Valid author slugs.
 * @param {string} [options.storagePrefix] Public URL prefix of the image bucket.
 * @param {Date} [options.now]
 */
export function validateArticleInput(input, options) {
  const { intent, currentStatus, categories = [], authors = [], storagePrefix = "", now = new Date() } = options;
  const errors = {};
  const warnings = [];

  if (!INTENTS.includes(intent)) {
    return { ok: false, errors: { form: "Unknown action." }, warnings, data: null };
  }

  const status = targetStatus(intent, currentStatus);
  const strict = status === "published" || status === "scheduled";
  const raw = input && typeof input === "object" ? input : {};

  const data = {
    title: singleLine(raw.title, LIMITS.title),
    slug: singleLine(raw.slug, SLUG_MAX).toLowerCase(),
    subtitle: singleLine(raw.subtitle, LIMITS.subtitle),
    excerpt: singleLine(raw.excerpt, LIMITS.excerpt),
    body: str(raw.body, LIMITS.body).replace(/\r\n/g, "\n"),
    featuredImageUrl: singleLine(raw.featuredImageUrl, 1000),
    featuredImageAlt: singleLine(raw.featuredImageAlt, LIMITS.imageAlt),
    featuredImageWidth: positiveInt(raw.featuredImageWidth),
    featuredImageHeight: positiveInt(raw.featuredImageHeight),
    featuredImageCredit: singleLine(raw.featuredImageCredit, LIMITS.imageCredit),
    categorySlug: singleLine(raw.categorySlug, 80),
    authorSlug: singleLine(raw.authorSlug, 80),
    tags: normaliseTags(raw.tags),
    seoTitle: singleLine(raw.seoTitle, LIMITS.seoTitle),
    seoDescription: singleLine(raw.seoDescription, LIMITS.seoDescription),
    canonicalUrl: singleLine(raw.canonicalUrl, 500),
    status,
    scheduledFor: null,
    updatedOn: singleLine(raw.updatedOn, 10),
    featured: raw.featured === true || raw.featured === "true" || raw.featured === "on",
    sources: normaliseSources(raw.sources, errors),
    factCheckStatus: raw.factCheckStatus === "verified" ? "verified" : "pending",
    reviewedBy: singleLine(raw.reviewedBy, 80),
    reviewedOn: singleLine(raw.reviewedOn, 10),
    reviewNotes: str(raw.reviewNotes, LIMITS.reviewNotes).trim(),
    editorialNotes: str(raw.editorialNotes, LIMITS.editorialNotes).trim(),
  };

  // Lengths (applied to everything, including drafts).
  for (const [field, max] of [
    ["title", LIMITS.title],
    ["subtitle", LIMITS.subtitle],
    ["excerpt", LIMITS.excerpt],
    ["featuredImageAlt", LIMITS.imageAlt],
    ["featuredImageCredit", LIMITS.imageCredit],
    ["seoTitle", LIMITS.seoTitle],
    ["seoDescription", LIMITS.seoDescription],
    ["reviewNotes", LIMITS.reviewNotes],
    ["editorialNotes", LIMITS.editorialNotes],
  ]) {
    if (data[field].length > max) errors[field] = `Keep this under ${max} characters.`;
  }
  if (data.body.length > LIMITS.body) errors.body = `The article body is too long (over ${LIMITS.body.toLocaleString("en-IN")} characters).`;

  if (!data.title) errors.title = "Add a title.";
  if (!data.slug) errors.slug = "Add a URL slug.";
  else if (RESERVED_SLUGS.has(data.slug)) errors.slug = `"${data.slug}" is reserved. Choose another slug.`;
  else if (!SLUG_PATTERN.test(data.slug) || !isValidSlug(data.slug)) {
    errors.slug = "Use lowercase letters, numbers and single hyphens only (for example how-to-save-tax).";
  }

  if (data.categorySlug && !categories.includes(data.categorySlug)) errors.categorySlug = "Choose a category from the list.";
  if (data.authorSlug && !authors.includes(data.authorSlug)) errors.authorSlug = "Choose an author from the list.";
  if (data.reviewedBy && !authors.includes(data.reviewedBy)) errors.reviewedBy = "Choose a reviewer from the author list.";
  if (data.tags.length > LIMITS.tags) errors.tags = `Use at most ${LIMITS.tags} tags.`;

  if (!isAllowedImageUrl(data.featuredImageUrl, storagePrefix)) {
    errors.featuredImageUrl = "Choose an image from the media library (or a /images/... file from the site).";
  }
  if (data.featuredImageUrl && !data.featuredImageAlt) {
    if (strict) errors.featuredImageAlt = "Describe the image for readers who cannot see it.";
    else warnings.push("The featured image has no alt text yet.");
  }

  if (data.canonicalUrl && !/^https:\/\/[^\s]+$/.test(data.canonicalUrl)) {
    errors.canonicalUrl = "The canonical URL must be a full https:// address.";
  }

  const today = istDate.format(now);
  if (data.updatedOn) {
    if (!DATE_PATTERN.test(data.updatedOn) || Number.isNaN(Date.parse(data.updatedOn))) errors.updatedOn = "Use a valid date.";
    else if (data.updatedOn > today) errors.updatedOn = "The updated date cannot be in the future.";
  }
  if (data.reviewedOn) {
    if (!DATE_PATTERN.test(data.reviewedOn) || Number.isNaN(Date.parse(data.reviewedOn))) errors.reviewedOn = "Use a valid date.";
    else if (data.reviewedOn > today) errors.reviewedOn = "The review date cannot be in the future.";
  }
  if (data.factCheckStatus === "verified" && !data.reviewedOn) {
    warnings.push("Marked as fact-checked without a review date.");
  }

  if (status === "scheduled") {
    const when = Date.parse(raw.scheduledFor || "");
    if (!raw.scheduledFor || Number.isNaN(when)) errors.scheduledFor = "Choose the date and time to publish.";
    else if (when < now.getTime() + SCHEDULE_MIN_LEAD_MS) errors.scheduledFor = "Choose a time at least one minute in the future, or publish now.";
    else if (when > now.getTime() + SCHEDULE_MAX_LEAD_MS) errors.scheduledFor = "Schedule no more than a year ahead.";
    else data.scheduledFor = new Date(when).toISOString();
  }

  const stats = textStats(data.body);
  data.wordCount = stats.wordCount;
  data.readingMinutes = stats.readingMinutes;

  if (strict) {
    if (data.excerpt.length < LIMITS.excerptMin) {
      errors.excerpt = `Write an excerpt of at least ${LIMITS.excerptMin} characters. It is shown on cards and used as the meta description.`;
    }
    if (!data.categorySlug) errors.categorySlug = "Choose a category before publishing.";
    if (!data.authorSlug) errors.authorSlug = "Choose an author before publishing.";
    if (stats.wordCount < LIMITS.bodyMinWords) {
      errors.body = `The article has ${stats.wordCount} words. Publish at least ${LIMITS.bodyMinWords} words of original content.`;
    }
    const meta = data.seoDescription || data.excerpt;
    if (meta && meta.length < LIMITS.metaMin) errors.seoDescription = `The meta description should be at least ${LIMITS.metaMin} characters.`;
    if ((intent === "publish" || intent === "schedule") && raw.factCheckConfirmed !== true) {
      errors.factCheckConfirmed = "Confirm that figures, rates, tax rules and regulations have been checked against official sources.";
    }
  }

  const meta = data.seoDescription || data.excerpt;
  if (meta.length > LIMITS.metaIdealMax) warnings.push(`The meta description is ${meta.length} characters; search engines usually show about ${LIMITS.metaIdealMax}.`);
  if ((data.seoTitle || data.title).length > LIMITS.seoTitleIdeal) {
    warnings.push(`The SEO title is ${(data.seoTitle || data.title).length} characters; aim for ${LIMITS.seoTitleIdeal} or fewer.`);
  }
  if (/^#\s/m.test(data.body.replace(/```[\s\S]*?```/g, ""))) warnings.push('Headings starting with "# " are shown as section headings. Start sections at "##".');
  if (/<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/i.test(data.body.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, ""))) {
    warnings.push("HTML tags in the body are not displayed. Use Markdown formatting instead.");
  }
  if (strict && data.sources.length === 0) warnings.push("No sources are listed. Link to official sources for figures and rules.");

  return { ok: Object.keys(errors).length === 0, errors, warnings, data };
}
