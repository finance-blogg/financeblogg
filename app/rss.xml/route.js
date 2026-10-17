import { getAllArticles, getAuthor } from "@/lib/content";
import { getCategory } from "@/lib/categories";
import { toIsoDate } from "@/lib/format";
import { absoluteUrl, siteConfig } from "@/lib/site";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const articles = getAllArticles()
    .filter((a) => a.status === "published")
    .slice(0, 50);

  const items = articles
    .map((a) => {
      const url = absoluteUrl(`/blog/${a.slug}`);
      const author = getAuthor(a.author);
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(a.description)}</description>
      <pubDate>${new Date(toIsoDate(a.date)).toUTCString()}</pubDate>
      <category>${escapeXml(getCategory(a.category)?.name || "")}</category>
      <dc:creator>${escapeXml(author?.name || siteConfig.name)}</dc:creator>
    </item>`;
    })
    .join("\n");

  const lastBuild = articles[0] ? new Date(toIsoDate(articles[0].updated || articles[0].date)).toUTCString() : "";

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
