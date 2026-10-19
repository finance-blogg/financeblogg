/** Cache tags shared by the public content layer and the admin mutations. */
export const CACHE_TAGS = {
  articles: "cms-articles",
  categories: "cms-categories",
  authors: "cms-authors",
  article: (slug) => `cms-article-${slug}`,
};
