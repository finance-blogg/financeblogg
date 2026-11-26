import { getAllArticles, getCategoriesWithCounts } from "@/lib/content";
import { siteConfig, absoluteUrl } from "@/lib/site";

/**
 * Machine-readable site summary for AI crawlers and assistants.
 * See https://llmstxt.org/
 */
export async function GET() {
  const [articles, categories] = await Promise.all([getAllArticles(), getCategoriesWithCounts()]);
  const published = articles.filter((a) => a.status === "published");
  const topics = categories.filter((c) => c.count > 0);

  const lines = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.tagline}`,
    "",
    siteConfig.description,
    "",
    "Educational content only. Not personalised financial advice.",
    "",
    "## Site",
    "",
    `- Home: ${absoluteUrl("/")}`,
    `- All articles: ${absoluteUrl("/blog")}`,
    `- About: ${absoluteUrl("/about")}`,
    `- Editorial policy: ${absoluteUrl("/editorial-policy")}`,
    `- Corrections policy: ${absoluteUrl("/corrections-policy")}`,
    `- Disclaimer: ${absoluteUrl("/disclaimer")}`,
    `- Contact: ${absoluteUrl("/contact")}`,
    `- RSS: ${absoluteUrl("/rss.xml")}`,
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
    "## Topics",
    "",
    ...topics.map((c) => `- ${c.name}: ${absoluteUrl(`/category/${c.slug}`)} (${c.count} articles)`),
    "",
    "## Recent articles",
    "",
    ...published.slice(0, 40).map((a) => `- [${a.title}](${absoluteUrl(`/blog/${a.slug}`)}): ${a.description}`),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
