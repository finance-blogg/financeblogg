import { getArticle, getArticleSlugs } from "@/lib/content";
import { getCategory } from "@/lib/categories";
import { ogSize, renderOgImage } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Article title card";

export function generateStaticParams() {
  const slugs = getArticleSlugs();
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "no-articles-yet" }];
}

export default async function Image({ params }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) {
    return renderOgImage({ title: "Educational finance explainers for India" });
  }
  return renderOgImage({
    eyebrow: getCategory(article.category)?.name,
    title: article.title,
    footer: `${article.readingMinutes} min read · Educational content, not financial advice`,
  });
}
