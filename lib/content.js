import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { categories as codeCategories } from "./categories";
import { mdxArticles, mdxAuthors, mdxPages, popularSlugs } from "./mdx-source";
import { createPublicClient } from "./supabase/public";
import { isSupabaseConfigured } from "./supabase/config";
import { CACHE_TAGS } from "./cms/cache-tags";
import { ARTICLE_COLUMNS, SUMMARY_COLUMNS, mapDbArticle, mapDbAuthor, mapDbCategory, mapDbSummary } from "./cms/mappers";

/**
 * Public content access layer.
 *
 * Merges two sources:
 *   - local MDX files (content/articles), read once per server process;
 *   - published articles in Supabase, read with the anon key so Row Level
 *     Security only ever returns published content.
 *
 * Every read is wrapped in `use cache` and tagged, so pages stay static and
 * the database is queried only when a tag is invalidated (see
 * lib/cms/revalidate.js) or the cache lifetime ends. A database article with
 * the same slug as an MDX file, or one imported from it, replaces the file.
 *
 * Database errors throw instead of returning partial data. During background
 * revalidation that keeps the last good page online; at build time it stops
 * a deployment that would silently drop articles.
 */

const INDEX_LIMIT = 5000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const ARTICLES_PER_PAGE = 12;

function applyContentCacheLife() {
  // Tags handle changes made from the dashboard. The shorter database lifetime
  // also picks up edits made directly in Supabase.
  cacheLife(isSupabaseConfigured() ? "hours" : "max");
}

function dbError(context, error) {
  return new Error(`[content] Supabase ${context} failed: ${error?.message || error}`);
}

function summary(article) {
  const { body, file, searchText, ...rest } = article;
  return rest;
}

function byDateDesc(a, b) {
  const da = a.date || "";
  const db = b.date || "";
  if (da !== db) return da < db ? 1 : -1;
  return a.title.localeCompare(b.title);
}

async function loadImportedSlugs(client) {
  const { data, error } = await client.rpc("mdx_import_slugs");
  if (error) throw dbError("imported slug lookup", error);
  return (data || []).map((row) => (typeof row === "string" ? row : row.mdx_import_slugs));
}

async function loadIndex() {
  "use cache";
  cacheTag(CACHE_TAGS.articles);
  applyContentCacheLife();

  const mdx = mdxArticles.map(summary);
  const client = createPublicClient();
  if (!client) return mdx.sort(byDateDesc);

  const [{ data, error }, imported] = await Promise.all([
    client
      .from("articles")
      .select(SUMMARY_COLUMNS)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(INDEX_LIMIT),
    loadImportedSlugs(client),
  ]);
  if (error) throw dbError("article index", error);

  const dbArticles = data.map(mapDbSummary);
  const claimed = new Set([...imported, ...dbArticles.map((a) => a.slug)]);
  return [...dbArticles, ...mdx.filter((a) => !claimed.has(a.slug))].sort(byDateDesc);
}

export async function getAllArticles() {
  return loadIndex();
}

export async function getArticleSlugs() {
  return (await loadIndex()).map((a) => a.slug);
}

function paginate(list, page, perPage) {
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    articles: list.slice((current - 1) * perPage, current * perPage),
    page: current,
    total,
    totalPages,
    exists: page >= 1 && page <= totalPages,
  };
}

export async function getArticlesPage({ page = 1, perPage = ARTICLES_PER_PAGE, category } = {}) {
  const index = await loadIndex();
  const list = category ? index.filter((a) => a.category === category) : index;
  return paginate(list, page, perPage);
}

export async function getArticle(slug) {
  "use cache";
  cacheTag(CACHE_TAGS.articles, CACHE_TAGS.article(slug));
  applyContentCacheLife();

  if (!SLUG_PATTERN.test(String(slug))) return null;

  const client = createPublicClient();
  if (client) {
    const { data, error } = await client
      .from("articles")
      .select(ARTICLE_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw dbError(`article "${slug}"`, error);
    if (data) return mapDbArticle(data);
    if ((await loadImportedSlugs(client)).includes(slug)) return null;
  }

  const mdx = mdxArticles.find((a) => a.slug === slug);
  if (!mdx) return null;
  const { file, searchText, ...article } = mdx;
  return article;
}

export async function getArticlesByCategory(categorySlug) {
  return (await loadIndex()).filter((a) => a.category === categorySlug);
}

export async function getArticlesByAuthor(authorSlug) {
  return (await loadIndex()).filter((a) => a.author === authorSlug || a.review?.reviewedBy === authorSlug);
}

export async function getFeaturedArticle() {
  const index = await loadIndex();
  return index.find((a) => a.featured) || index[0] || null;
}

/**
 * Popular articles come only from content/popular.json, which the owner fills
 * in from real analytics. If it is empty, no "popular" section is shown.
 */
export async function getPopularArticles(limit = 5) {
  const bySlug = new Map((await loadIndex()).map((a) => [a.slug, a]));
  return popularSlugs
    .map((slug) => bySlug.get(slug))
    .filter(Boolean)
    .slice(0, limit);
}

export async function getRelatedArticles(article, limit = 3) {
  const tagSet = new Set(article.tags || []);
  return (await loadIndex())
    .filter((a) => a.slug !== article.slug)
    .map((a) => {
      let score = a.category && a.category === article.category ? 3 : 0;
      for (const tag of a.tags) if (tagSet.has(tag)) score += 1;
      return { a, score };
    })
    .filter(({ score }) => score > 0)
    // Same comparator as the original MDX-only site, so related lists keep their order.
    .sort((x, y) => y.score - x.score || ((x.a.date || "") < (y.a.date || "") ? 1 : -1))
    .slice(0, limit)
    .map(({ a }) => a);
}

export async function getCategories() {
  "use cache";
  cacheTag(CACHE_TAGS.categories);
  applyContentCacheLife();

  const client = createPublicClient();
  if (!client) return codeCategories;
  const { data, error } = await client
    .from("categories")
    .select("slug,name,short_name,description,sort_order")
    .order("sort_order")
    .order("name");
  if (error) throw dbError("categories", error);
  return data.length ? data.map(mapDbCategory) : codeCategories;
}

export async function getCategory(slug) {
  return (await getCategories()).find((c) => c.slug === slug) || null;
}

export async function getCategoriesWithCounts() {
  const [categories, index] = await Promise.all([getCategories(), loadIndex()]);
  return categories.map((c) => ({ ...c, count: index.filter((a) => a.category === c.slug).length }));
}

async function loadAuthors() {
  "use cache";
  cacheTag(CACHE_TAGS.authors);
  applyContentCacheLife();

  const merged = new Map(mdxAuthors);
  const client = createPublicClient();
  if (client) {
    const { data, error } = await client
      .from("authors")
      .select("slug,name,role,bio,expertise,credentials,links,image_url,is_organization")
      .order("name");
    if (error) throw dbError("authors", error);
    for (const row of data) merged.set(row.slug, mapDbAuthor(row));
  }
  return [...merged.values()];
}

export async function getAllAuthors() {
  return loadAuthors();
}

export async function getAuthor(slug) {
  if (!slug) return null;
  return (await loadAuthors()).find((a) => a.slug === slug) || null;
}

function searchTerms(query) {
  return String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t) => t.length > 1)
    .slice(0, 8);
}

function scoreFields(article, terms) {
  const title = article.title.toLowerCase();
  const desc = (article.description || "").toLowerCase();
  const tags = (article.tags || []).join(" ").toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 6;
    if (tags.includes(term)) score += 3;
    if (desc.includes(term)) score += 2;
    score += 1;
  }
  return score;
}

export async function searchArticles(query, categorySlug) {
  "use cache";
  cacheTag(CACHE_TAGS.articles);
  cacheLife("hours");

  const terms = searchTerms(query);
  const index = await loadIndex();
  const inCategory = (a) => !categorySlug || a.category === categorySlug;
  if (terms.length === 0) return categorySlug ? index.filter(inCategory) : [];

  const visibleMdx = new Set(index.filter((a) => a.source === "mdx").map((a) => a.slug));
  const mdxResults = mdxArticles
    .filter((a) => visibleMdx.has(a.slug) && inCategory(a))
    .filter((a) => terms.every((t) => a.searchText.includes(t)))
    .map((a) => ({ a: summary(a), score: scoreFields(a, terms) }));

  let dbResults = [];
  const client = createPublicClient();
  if (client) {
    let request = client
      .from("articles")
      .select(SUMMARY_COLUMNS)
      .eq("status", "published")
      .is("deleted_at", null)
      .textSearch("search_vector", terms.join(" "), { type: "websearch", config: "english" })
      .limit(50);
    if (categorySlug) request = request.eq("category_slug", categorySlug);
    const { data, error } = await request;
    if (error) throw dbError("search", error);
    dbResults = data.map(mapDbSummary).map((a) => ({ a, score: scoreFields(a, terms) }));
  }

  return [...dbResults, ...mdxResults].sort((x, y) => y.score - x.score).map(({ a }) => a);
}

export function getPage(slug) {
  return mdxPages.get(slug) || null;
}
