import { getAllArticles, getAllAuthors, getCategories } from "@/lib/content";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { articleDates } from "@/lib/seo";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [all, authors, categories] = await Promise.all([getAllArticles(), getAllAuthors(), getCategories()]);
  const authorBySlug = new Map(authors.map((a) => [a.slug, a]));
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const articles = all.filter((a) => a.status === "published").slice(0, 50);

  const items = articles
    .map((a) => {
      const url = absoluteUrl(`/blog/${a.slug}`);
      const author = authorBySlug.get(a.author);
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(a.description)}</description>
      <pubDate>${new Date(articleDates(a).published).toUTCString()}</pubDate>
      <category>${escapeXml(categoryBySlug.get(a.category)?.name || "")}</category>
      <dc:creator>${escapeXml(author?.name || siteConfig.name)}</dc:creator>
    </item>`;
    })
    .join("\n");

  const lastBuild = articles[0] ? new Date(articleDates(articles[0]).modified).toUTCString() : "";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${siteConfig.url}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>en-in</language>
    ${lastBuild ? `<lastBuildDate>${lastBuild}</lastBuildDate>` : ""}
    <atom:link href="${absoluteUrl("/rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
