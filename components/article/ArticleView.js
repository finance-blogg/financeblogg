import Link from "next/link";
import Breadcrumbs from "./Breadcrumbs";
import CategoryBadge from "./CategoryBadge";
import ArticleMeta from "./ArticleMeta";
import EditorialInfo from "./EditorialInfo";
import FeaturedImage from "./FeaturedImage";
import TableOfContents from "./TableOfContents";
import ShareLinks from "./ShareLinks";
import SourcesList from "./SourcesList";
import AuthorBox from "./AuthorBox";
import RelatedArticles from "./RelatedArticles";
import FinancialDisclaimer from "./FinancialDisclaimer";
import ArticleBody from "./ArticleBody";
import AdSlot from "@/components/ads/AdSlot";

const UNASSIGNED_AUTHOR = { slug: "", name: "Author not selected", role: "", bio: "" };

/**
 * The article template, shared by the public article page and the admin
 * preview. `isPreview` removes ads, structured data and share links.
 */
export default function ArticleView({ article, author, reviewer, category, related = [], url, sidebar = null, isPreview = false }) {
  const byline = author || UNASSIGNED_AUTHOR;
  const showAds = !isPreview;

  return (
    <>
      <div className="container-page pt-8">
        <Breadcrumbs
          structuredData={!isPreview}
          items={[...(category ? [{ name: category.name, href: `/category/${category.slug}` }] : []), { name: article.title || "Untitled" }]}
        />
      </div>

      <div className={`container-page mt-8 grid gap-12 ${sidebar ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
        <article className="min-w-0" aria-labelledby="article-title">
          <header className="max-w-3xl">
            {article.status === "draft" && !isPreview && (
              <p className="mb-4 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 uppercase">
                Draft (not visible in production)
              </p>
            )}
            <CategoryBadge slug={article.category} />
            <h1 id="article-title" className="mt-2 font-serif text-3xl leading-tight font-semibold text-navy-950 sm:text-4xl lg:text-[2.75rem]">
              {article.title || "Untitled article"}
            </h1>
            {article.subtitle && <p className="mt-4 text-lg leading-relaxed text-navy-600 sm:text-xl">{article.subtitle}</p>}
            <div className="mt-6 flex flex-col gap-4 border-y border-navy-100 py-4 sm:flex-row sm:items-center sm:justify-between">
              <ArticleMeta article={article} author={byline} />
            </div>
            <div className="mt-4">
              <EditorialInfo article={article} reviewer={reviewer} />
            </div>
          </header>

          {article.image?.src && (
            <figure className="mt-8 max-w-3xl">
              <div className="overflow-hidden rounded-xl ring-1 ring-navy-100">
                <FeaturedImage image={article.image} priority />
              </div>
              {article.image.credit && <figcaption className="mt-2 text-xs text-navy-500">{article.image.credit}</figcaption>}
            </figure>
          )}

          <div className="mt-10 max-w-3xl">
            <TableOfContents headings={article.headings} className="mb-10" />

            <div className="article-prose">
              <ArticleBody article={article} showAds={showAds} />
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

            {!isPreview && url && (
              <div className="mt-10 border-t border-navy-100 pt-6">
                <ShareLinks url={url} title={article.title} />
              </div>
            )}

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

            {showAds && <AdSlot placement="articleEnd" />}
          </div>

          <RelatedArticles articles={related} />
        </article>

        {sidebar && (
          <aside aria-label="Sidebar" className="hidden lg:block">
            <div className="sticky top-32">{sidebar}</div>
          </aside>
        )}
      </div>
    </>
  );
}
