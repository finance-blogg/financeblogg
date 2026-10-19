import { absoluteUrl } from "@/lib/site";
import { toIsoDate } from "@/lib/format";
import { getAllArticles, getAllAuthors, getArticlesPage, getCategoriesWithCounts, getPage } from "@/lib/content";
import { articleDates } from "@/lib/seo";

const STATIC_PAGES = [
  ["about", "/about"],
  ["editorial-policy", "/editorial-policy"],
  ["corrections-policy", "/corrections-policy"],
  ["privacy-policy", "/privacy-policy"],
  ["terms", "/terms"],
  ["disclaimer", "/disclaimer"],
];

export default async function sitemap() {
  const [all, authors, categories, { totalPages }] = await Promise.all([
    getAllArticles(),
    getAllAuthors(),
    getCategoriesWithCounts(),
    getArticlesPage({ page: 1 }),
  ]);
  // Drafts and scheduled articles are never in the public index; this filter is a second guard.
  const articles = all.filter((a) => a.status === "published");
  const latest = articles.reduce((max, a) => {
    const d = articleDates(a).modified;
    return d && (!max || Date.parse(d) > Date.parse(max)) ? d : max;
  }, "");
  const lastModified = latest || undefined;
  const canonicalHere = (a) => !a.seo?.canonical || a.seo.canonical === absoluteUrl(`/blog/${a.slug}`);

  return [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/blog"), lastModified, changeFrequency: "daily", priority: 0.8 },
    ...Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
      url: absoluteUrl(`/blog/page/${i + 2}`),
      changeFrequency: "daily",
      priority: 0.4,
    })),
    ...articles.filter(canonicalHere).map((a) => ({
      url: absoluteUrl(`/blog/${a.slug}`),
      lastModified: articleDates(a).modified,
      changeFrequency: "monthly",
      priority: 0.9,
    })),
    ...categories
      .filter((c) => c.count > 0)
      .map((c) => ({ url: absoluteUrl(`/category/${c.slug}`), lastModified, changeFrequency: "weekly", priority: 0.6 })),
    ...authors.map((a) => ({ url: absoluteUrl(`/authors/${a.slug}`), changeFrequency: "monthly", priority: 0.4 })),
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.3 },
    ...STATIC_PAGES.map(([slug, path]) => {
      const page = getPage(slug);
      return {
        url: absoluteUrl(path),
        ...(page?.updated ? { lastModified: toIsoDate(page.updated) } : {}),
        changeFrequency: "yearly",
        priority: 0.3,
      };
    }),
  ];
}
