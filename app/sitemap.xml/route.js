import { absoluteUrl } from "@/lib/site";
import { toIsoDate } from "@/lib/format";
import { getAllArticles, getAllAuthors, getArticlesPage, getCategoriesWithCounts, getPage } from "@/lib/content";
import { articleDates } from "@/lib/seo";

/**
 * Served as a Route Handler (not app/sitemap.js) so publish/unpublish can
 * refresh it. Next.js 16 still emits metadata `sitemap.js` as a static file
 * at build time, which ignores revalidatePath/updateTag — that is why
 * admin-published articles were missing until the next deploy.
 * See https://github.com/vercel/next.js/issues/99055
 */

const STATIC_PAGES = [
  ["about", "/about"],
  ["editorial-policy", "/editorial-policy"],
  ["corrections-policy", "/corrections-policy"],
  ["privacy-policy", "/privacy-policy"],
  ["terms", "/terms"],
  ["disclaimer", "/disclaimer"],
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toLastmod(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function urlEntry({ url, lastModified, changeFrequency, priority }) {
  const lastmod = toLastmod(lastModified);
  return `  <url>
    <loc>${escapeXml(url)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
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

  const entries = [
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

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(urlEntry).join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
