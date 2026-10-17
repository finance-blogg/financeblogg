import { absoluteUrl } from "@/lib/site";
import { toIsoDate } from "@/lib/format";
import { getAllArticles, getAllAuthors, getCategoriesWithCounts, getPage } from "@/lib/content";

const STATIC_PAGES = [
  ["about", "/about"],
  ["editorial-policy", "/editorial-policy"],
  ["corrections-policy", "/corrections-policy"],
  ["privacy-policy", "/privacy-policy"],
  ["terms", "/terms"],
  ["disclaimer", "/disclaimer"],
];

export default function sitemap() {
  const articles = getAllArticles().filter((a) => a.status === "published");
  const latest = articles.reduce((max, a) => {
    const d = a.updated || a.date;
    return d > max ? d : max;
  }, "");
  const lastModified = latest ? toIsoDate(latest) : undefined;

  return [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/blog"), lastModified, changeFrequency: "daily", priority: 0.8 },
    ...articles.map((a) => ({
      url: absoluteUrl(`/blog/${a.slug}`),
      lastModified: toIsoDate(a.updated || a.date),
      changeFrequency: "monthly",
      priority: 0.9,
    })),
    ...getCategoriesWithCounts()
      .filter((c) => c.count > 0)
      .map((c) => ({ url: absoluteUrl(`/category/${c.slug}`), lastModified, changeFrequency: "weekly", priority: 0.6 })),
    ...getAllAuthors().map((a) => ({ url: absoluteUrl(`/authors/${a.slug}`), changeFrequency: "monthly", priority: 0.4 })),
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
