import { Suspense } from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ArticleCard from "@/components/article/ArticleCard";
import SearchForm from "@/components/search/SearchForm";
import { getCategory } from "@/lib/categories";
import { getCategoriesWithCounts, searchArticles } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Search Articles",
  description: "Search Rupee Ledger explainers by keyword and filter by category.",
  path: "/search",
  // Search result pages should not be indexed (thin, near-duplicate content).
  noIndex: true,
});

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

async function SearchResults({ searchParams }) {
  const params = await searchParams;
  const query = String(firstValue(params.q) || "").trim().slice(0, 100);
  const categorySlug = getCategory(String(firstValue(params.category) || ""))?.slug || "";
  const results = searchArticles(query, categorySlug);
  const category = categorySlug ? getCategory(categorySlug) : null;
  const hasInput = query || category;

  return (
    <>
      <div className="max-w-2xl">
        <SearchForm id="search-page" size="lg" showCategory defaultQuery={query} defaultCategory={categorySlug} />
      </div>

      <div className="mt-10" aria-live="polite">
        {!hasInput ? (
          <SearchTips />
        ) : (
          <>
            <h2 className="font-serif text-xl font-semibold text-navy-950">
              {results.length} {results.length === 1 ? "result" : "results"}
              {query && <> for “{query}”</>}
              {category && <> in {category.name}</>}
            </h2>
            {results.length === 0 ? (
              <div className="mt-4 text-navy-600">
                <p>No articles matched. Try fewer or different words, or browse a category below.</p>
                <SearchTips />
              </div>
            ) : (
              <div className="mt-8 space-y-10">
                {results.map((a) => (
                  <ArticleCard key={a.slug} article={a} variant="horizontal" />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function SearchTips() {
  const categories = getCategoriesWithCounts().filter((c) => c.count > 0);
  return (
    <div className="mt-6">
      <p className="text-sm font-semibold text-navy-900">Browse by topic</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/category/${c.slug}`} className="rounded-full bg-navy-50 px-3 py-1.5 text-sm text-navy-700 hover:bg-navy-100">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SearchPage({ searchParams }) {
  return (
    <>
      <PageHeader title="Search articles" breadcrumbs={[{ name: "Search" }]} />
      <div className="container-page mt-10">
        <Suspense fallback={<p className="text-navy-500">Loading search…</p>}>
          <SearchResults searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
