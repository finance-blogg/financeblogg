import { getArticle, getArticleSlugs, getCategory } from "@/lib/content";
import { ogSize, renderOgImage } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Article title card";

export async function generateStaticParams() {
  const slugs = await getArticleSlugs();
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "no-articles-yet" }];
}

export default async function Image({ params }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) {
    return renderOgImage({ title: "Educational finance explainers for India" });
  }
  const category = await getCategory(article.category);
  return renderOgImage({
    eyebrow: category?.name,
    title: article.title,
    footer: `${article.readingMinutes} min read · Educational content, not financial advice`,
  });
}
