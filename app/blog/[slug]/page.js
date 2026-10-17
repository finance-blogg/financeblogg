import { notFound } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/article/Breadcrumbs";
import CategoryBadge from "@/components/article/CategoryBadge";
import ArticleMeta from "@/components/article/ArticleMeta";
import EditorialInfo from "@/components/article/EditorialInfo";
import FeaturedImage from "@/components/article/FeaturedImage";
import TableOfContents from "@/components/article/TableOfContents";
import ShareLinks from "@/components/article/ShareLinks";
import SourcesList from "@/components/article/SourcesList";
import AuthorBox from "@/components/article/AuthorBox";
import RelatedArticles from "@/components/article/RelatedArticles";
import FinancialDisclaimer from "@/components/article/FinancialDisclaimer";
import Sidebar from "@/components/layout/Sidebar";
import AdSlot from "@/components/ads/AdSlot";
import MdxContent from "@/components/mdx/MdxContent";
import JsonLd from "@/components/seo/JsonLd";
import { getArticle, getArticleSlugs, getAuthor, getRelatedArticles } from "@/lib/content";
import { getCategory } from "@/lib/categories";
import { absoluteUrl } from "@/lib/site";
import { toIsoDate } from "@/lib/format";
import { articleJsonLd, pageMetadata } from "@/lib/seo";

// Fully static output; unknown slugs render completely first, so notFound() returns a real 404.
export const ensureStatic = "navigation";
export const instant = false;

export function generateStaticParams() {
  const slugs = getArticleSlugs();
  // Cache Components requires at least one param; the placeholder renders a 404.
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "no-articles-yet" }];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article not found", robots: { index: false } };
  const author = getAuthor(article.author);
  const base = pageMetadata({
    title: article.title,
    description: article.description,
    path: `/blog/${article.slug}`,
    ogType: "article",
    noIndex: article.status !== "published",
  });
  return {
    ...base,
    authors: [{ name: author.name, url: absoluteUrl(`/authors/${author.slug}`) }],
    keywords: article.tags,
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: toIsoDate(article.date),
      modifiedTime: toIsoDate(article.updated || article.date),
      section: getCategory(article.category)?.name,
      tags: article.tags,
      authors: [absoluteUrl(`/authors/${author.slug}`)],
    },
  };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const author = getAuthor(article.author);
  const reviewer = article.review.reviewedBy ? getAuthor(article.review.reviewedBy) : null;
  const category = getCategory(article.category);
  const related = getRelatedArticles(article, 3);
  const url = absoluteUrl(`/blog/${article.slug}`);

  return (
    <>
      <JsonLd data={articleJsonLd(article, author)} />

      <div className="container-page pt-8">
        <Breadcrumbs
          items={[
            { name: category.name, href: `/category/${category.slug}` },
            { name: article.title },
          ]}
        />
      </div>

      <div className="container-page mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0" aria-labelledby="article-title">
          <header className="max-w-3xl">
            {article.status === "draft" && (
              <p className="mb-4 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 uppercase">
                Draft (not visible in production)
              </p>
            )}
            <CategoryBadge slug={article.category} />
            <h1 id="article-title" className="mt-2 font-serif text-3xl leading-tight font-semibold text-navy-950 sm:text-4xl lg:text-[2.75rem]">
              {article.title}
            </h1>
            {article.subtitle && <p className="mt-4 text-lg leading-relaxed text-navy-600 sm:text-xl">{article.subtitle}</p>}
            <div className="mt-6 flex flex-col gap-4 border-y border-navy-100 py-4 sm:flex-row sm:items-center sm:justify-between">
              <ArticleMeta article={article} author={author} />
            </div>
            <div className="mt-4">
              <EditorialInfo article={article} reviewer={reviewer} />
            </div>
          </header>

          <figure className="mt-8 max-w-3xl">
            <div className="overflow-hidden rounded-xl ring-1 ring-navy-100">
              <FeaturedImage image={article.image} priority />
            </div>
            {article.image.credit && (
              <figcaption className="mt-2 text-xs text-navy-500">{article.image.credit}</figcaption>
            )}
          </figure>

          <div className="mt-10 max-w-3xl">
            <TableOfContents headings={article.headings} className="mb-10" />

            <div className="article-prose">
              <MdxContent source={article.body} />
            </div>

            <FinancialDisclaimer className="mt-12" />

            {article.tags.length > 0 && (
              <div className="mt-8">
                <h2 className="sr-only">Topics</h2>
                <ul className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <li key={tag}>
                      <Link
                        href={`/search?q=${encodeURIComponent(tag)}`}
                        className="rounded-full bg-navy-50 px-3 py-1 text-sm text-navy-700 hover:bg-navy-100"
                      >
                        {tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <SourcesList sources={article.sources} />

            <div className="mt-10 border-t border-navy-100 pt-6">
              <ShareLinks url={url} title={article.title} />
            </div>

            <AuthorBox author={author} />

            <p className="mt-6 text-sm text-navy-600">
              Spotted an error? Read our{" "}
              <Link href="/corrections-policy" className="link-underline">
                corrections policy
              </Link>{" "}
              and{" "}
              <Link href="/contact" className="link-underline">
                tell us
              </Link>
              .
            </p>

            <AdSlot placement="articleEnd" />
          </div>

          <RelatedArticles articles={related} />
        </article>

        <aside aria-label="Sidebar" className="hidden lg:block">
          <div className="sticky top-32">
            <Sidebar excludeSlug={article.slug} />
          </div>
        </aside>
      </div>
    </>
  );
}
