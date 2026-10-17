import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import GithubSlugger from "github-slugger";
import { categories, getCategory } from "./categories";

/**
 * Local content layer.
 *
 * Articles:  content/articles/*.mdx  (YAML frontmatter + MDX body)
 * Authors:   content/authors/*.json
 * Pages:     content/pages/*.mdx     (About, Privacy Policy, etc.)
 * Popular:   content/popular.json     (owner-maintained, from real analytics)
 *
 * Everything is read synchronously once per server process, so pages can be
 * prerendered at build time. Invalid content fails the build loudly instead of
 * silently publishing something broken.
 */

const CONTENT_DIR = path.join(process.cwd(), "content");
const ARTICLES_DIR = path.join(CONTENT_DIR, "articles");
const AUTHORS_DIR = path.join(CONTENT_DIR, "authors");
const PAGES_DIR = path.join(CONTENT_DIR, "pages");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WORDS_PER_MINUTE = 200;

/** Drafts are visible only in `next dev`, never in a production build. */
const includeDrafts = process.env.NODE_ENV === "development";

function fail(file, message) {
  throw new Error(`[content] ${path.relative(process.cwd(), file)}: ${message}`);
}

export function splitFrontmatter(raw, file) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) fail(file, "missing YAML frontmatter block (--- ... ---)");
  let data;
  try {
    data = YAML.parse(match[1]) || {};
  } catch (error) {
    fail(file, `invalid YAML frontmatter: ${error.message}`);
  }
  return { data, body: match[2] };
}

function asDate(value, file, field, required) {
  if (value === undefined || value === null || value === "") {
    if (required) fail(file, `"${field}" is required (YYYY-MM-DD)`);
    return null;
  }
  const str = String(value);
  if (!DATE_PATTERN.test(str) || Number.isNaN(Date.parse(str))) {
    fail(file, `"${field}" must be a valid date in YYYY-MM-DD format`);
  }
  return str;
}

function stripMdx(body) {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function plainHeadingText(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

/** Mirrors rehype-slug (github-slugger) so TOC links match rendered heading ids. */
export function extractHeadings(body) {
  const slugger = new GithubSlugger();
  const headings = [];
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const text = plainHeadingText(match[2]);
    headings.push({ depth: match[1].length, text, id: slugger.slug(text) });
  }
  return headings;
}

function readJsonDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => {
      const file = path.join(dir, f);
      try {
        return { file, data: JSON.parse(fs.readFileSync(file, "utf8")) };
      } catch (error) {
        fail(file, `invalid JSON: ${error.message}`);
      }
    });
}

function loadAuthors() {
  const map = new Map();
  for (const { file, data } of readJsonDir(AUTHORS_DIR)) {
    const slug = path.basename(file, ".json");
    if (!SLUG_PATTERN.test(slug)) fail(file, "file name must be a lowercase slug");
    if (!data.name) fail(file, '"name" is required');
    map.set(slug, {
      slug,
      name: data.name,
      role: data.role || "",
      bio: data.bio || "",
      expertise: Array.isArray(data.expertise) ? data.expertise : [],
      credentials: Array.isArray(data.credentials) ? data.credentials : [],
      links: data.links && typeof data.links === "object" ? data.links : {},
      image: data.image || null,
      isOrganization: Boolean(data.isOrganization),
    });
  }
  return map;
}

function normaliseSources(sources, file) {
  if (sources === undefined || sources === null) return [];
  if (!Array.isArray(sources)) fail(file, '"sources" must be a list');
  return sources.map((s, i) => {
    if (!s || !s.title || !s.url) fail(file, `sources[${i}] needs "title" and "url"`);
    if (!/^https:\/\//.test(s.url)) fail(file, `sources[${i}].url must start with https://`);
    return {
      title: String(s.title),
      publisher: s.publisher ? String(s.publisher) : "",
      url: String(s.url),
      note: s.note ? String(s.note) : "",
    };
  });
}

function loadArticles(authors) {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const seen = new Set();
  const articles = [];

  for (const name of fs.readdirSync(ARTICLES_DIR)) {
    if (!name.endsWith(".mdx") || name.startsWith("_")) continue;
    const file = path.join(ARTICLES_DIR, name);
    const { data, body } = splitFrontmatter(fs.readFileSync(file, "utf8"), file);

    const slug = data.slug || path.basename(name, ".mdx");
    if (!SLUG_PATTERN.test(slug)) fail(file, `slug "${slug}" must be lowercase words separated by hyphens`);
    if (seen.has(slug)) fail(file, `duplicate slug "${slug}"`);
    seen.add(slug);

    for (const field of ["title", "description", "category", "author"]) {
      if (!data[field]) fail(file, `"${field}" is required`);
    }
    const category = getCategory(data.category);
    if (!category) {
      fail(file, `unknown category "${data.category}". Use one of: ${categories.map((c) => c.slug).join(", ")}`);
    }
    if (!authors.has(data.author)) fail(file, `unknown author "${data.author}" (add content/authors/${data.author}.json)`);

    const status = data.status === "published" ? "published" : "draft";
    const image = data.image || {};
    if (!image.src || !image.alt) fail(file, '"image.src" and "image.alt" are required');

    const review = data.review || {};
    const factCheck = review.factCheck === "verified" ? "verified" : "pending";
    if (review.reviewedBy && !authors.has(review.reviewedBy)) {
      fail(file, `review.reviewedBy "${review.reviewedBy}" is not a known author`);
    }

    const plain = stripMdx(body);
    const wordCount = plain ? plain.split(" ").length : 0;

    articles.push({
      slug,
      title: String(data.title),
      subtitle: data.subtitle ? String(data.subtitle) : "",
      description: String(data.description),
      category: category.slug,
      author: data.author,
      date: asDate(data.date, file, "date", true),
      updated: asDate(data.updated, file, "updated", false),
      status,
      featured: Boolean(data.featured),
      image: {
        src: String(image.src),
        alt: String(image.alt),
        width: Number(image.width) || 1200,
        height: Number(image.height) || 630,
        credit: image.credit ? String(image.credit) : "",
      },
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      sources: normaliseSources(data.sources, file),
      review: {
        factCheck,
        reviewedBy: review.reviewedBy || null,
        reviewedOn: asDate(review.reviewedOn, file, "review.reviewedOn", false),
        notes: Array.isArray(review.notes) ? review.notes.map(String) : [],
      },
      headings: extractHeadings(body),
      readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
      wordCount,
      searchText: `${data.title} ${data.subtitle || ""} ${data.description} ${(data.tags || []).join(" ")} ${plain}`.toLowerCase(),
      body,
      file,
    });
  }

  return articles.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
}

function loadPages() {
  const map = new Map();
  if (!fs.existsSync(PAGES_DIR)) return map;
  for (const name of fs.readdirSync(PAGES_DIR)) {
    if (!name.endsWith(".mdx")) continue;
    const file = path.join(PAGES_DIR, name);
    const { data, body } = splitFrontmatter(fs.readFileSync(file, "utf8"), file);
    if (!data.title || !data.description) fail(file, '"title" and "description" are required');
    map.set(path.basename(name, ".mdx"), {
      slug: path.basename(name, ".mdx"),
      title: String(data.title),
      description: String(data.description),
      updated: asDate(data.updated, file, "updated", false),
      body,
    });
  }
  return map;
}

function loadPopular() {
  const file = path.join(CONTENT_DIR, "popular.json");
  if (!fs.existsSync(file)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data.slugs) ? data.slugs : [];
  } catch (error) {
    fail(file, `invalid JSON: ${error.message}`);
  }
}

const authors = loadAuthors();
const allArticles = loadArticles(authors);
const visibleArticles = allArticles.filter((a) => includeDrafts || a.status === "published");
const articleBySlug = new Map(visibleArticles.map((a) => [a.slug, a]));
const pages = loadPages();
const popularSlugs = loadPopular();

/** Strip the raw body and file path for lists and cards. */
function summary(article) {
  const { body, file, searchText, ...rest } = article;
  return rest;
}

export function getAllArticles() {
  return visibleArticles.map(summary);
}

export function getArticle(slug) {
  return articleBySlug.get(slug) || null;
}

export function getArticleSlugs() {
  return visibleArticles.map((a) => a.slug);
}

export function getArticlesByCategory(categorySlug) {
  return visibleArticles.filter((a) => a.category === categorySlug).map(summary);
}

export function getArticlesByAuthor(authorSlug) {
  return visibleArticles
    .filter((a) => a.author === authorSlug || a.review.reviewedBy === authorSlug)
    .map(summary);
}

export function getFeaturedArticle() {
  const featured = visibleArticles.find((a) => a.featured) || visibleArticles[0];
  return featured ? summary(featured) : null;
}

/**
 * Popular articles come only from content/popular.json, which the owner fills
 * in from real analytics. If it is empty, no "popular" section is shown.
 */
export function getPopularArticles(limit = 5) {
  return popularSlugs
    .map((slug) => articleBySlug.get(slug))
    .filter(Boolean)
    .slice(0, limit)
    .map(summary);
}

export function getRelatedArticles(article, limit = 3) {
  const tagSet = new Set(article.tags);
  return visibleArticles
    .filter((a) => a.slug !== article.slug)
    .map((a) => {
      let score = a.category === article.category ? 3 : 0;
      for (const tag of a.tags) if (tagSet.has(tag)) score += 1;
      return { a, score };
    })
    .filter(({ score }) => score > 0)
    .sort((x, y) => y.score - x.score || (x.a.date < y.a.date ? 1 : -1))
    .slice(0, limit)
    .map(({ a }) => summary(a));
}

export function getCategoriesWithCounts() {
  return categories.map((c) => ({
    ...c,
    count: visibleArticles.filter((a) => a.category === c.slug).length,
  }));
}

export function searchArticles(query, categorySlug) {
  const terms = String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t) => t.length > 1)
    .slice(0, 8);

  const pool = categorySlug
    ? visibleArticles.filter((a) => a.category === categorySlug)
    : visibleArticles;

  if (terms.length === 0) return categorySlug ? pool.map(summary) : [];

  return pool
    .map((a) => {
      const title = a.title.toLowerCase();
      const desc = a.description.toLowerCase();
      const tags = a.tags.join(" ").toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (!a.searchText.includes(term)) return null;
        if (title.includes(term)) score += 6;
        if (tags.includes(term)) score += 3;
        if (desc.includes(term)) score += 2;
        score += 1;
      }
      return { a, score };
    })
    .filter(Boolean)
    .sort((x, y) => y.score - x.score)
    .map(({ a }) => summary(a));
}

export function getAuthor(slug) {
  return authors.get(slug) || null;
}

export function getAllAuthors() {
  return [...authors.values()];
}

export function getPage(slug) {
  return pages.get(slug) || null;
}
