import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { categories, getCategory } from "./categories";
import { extractHeadings } from "./cms/headings";

export { extractHeadings };

/**
 * Local MDX content source. Public pages read it through lib/content.js,
 * which merges it with articles stored in Supabase.
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
      source: "mdx",
      bodyFormat: "mdx",
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

/**
 * Set CMS_MDX_ARTICLES=off once every MDX article has been imported into the
 * database and checked, to stop serving the file versions. The files stay in
 * the repository as a backup.
 */
export const mdxArticlesEnabled = String(process.env.CMS_MDX_ARTICLES || "on").toLowerCase() !== "off";

export const mdxAuthors = loadAuthors();
const allMdxArticles = loadArticles(mdxAuthors);

/** Every MDX article, drafts included. Used for slug-collision checks and imports. */
export const allMdxArticleRecords = allMdxArticles;

/** MDX articles the public site may show (drafts only in `next dev`). */
export const mdxArticles = mdxArticlesEnabled
  ? allMdxArticles.filter((a) => includeDrafts || a.status === "published")
  : [];

export const mdxPages = loadPages();
export const popularSlugs = loadPopular();

