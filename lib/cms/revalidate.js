import "server-only";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";

/**
 * Cache invalidation after content changes.
 *
 * In Server Actions, updateTag expires entries immediately so the admin sees
 * their change on the next request (read-your-own-writes). Route handlers
 * (the scheduled-publishing job) cannot use updateTag, so they expire with
 * revalidateTag(tag, { expire: 0 }). Paths are revalidated as a second
 * guarantee for the pages and generated files that list articles.
 */
function expire(tag, context) {
  if (context === "action") updateTag(tag);
  else revalidateTag(tag, { expire: 0 });
}

const LISTING_PATHS = ["/", "/blog", "/search", "/sitemap.xml", "/rss.xml"];

export function invalidateArticles({ slugs = [], categories = [], authors = [], context = "action" } = {}) {
  expire(CACHE_TAGS.articles, context);
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))];
  for (const slug of uniqueSlugs) expire(CACHE_TAGS.article(slug), context);

  const paths = new Set(LISTING_PATHS);
  for (const slug of uniqueSlugs) {
    paths.add(`/blog/${slug}`);
    paths.add(`/blog/${slug}/opengraph-image`);
  }
  for (const category of categories.filter(Boolean)) paths.add(`/category/${category}`);
  for (const author of authors.filter(Boolean)) paths.add(`/authors/${author}`);
  for (const path of paths) revalidatePath(path);
}

export function invalidateCategories(context = "action") {
  expire(CACHE_TAGS.categories, context);
  revalidatePath("/", "layout");
}

export function invalidateAuthors(context = "action") {
  expire(CACHE_TAGS.authors, context);
  revalidatePath("/about");
  revalidatePath("/sitemap.xml");
}
