import PageHeader from "@/components/layout/PageHeader";
import Sidebar from "@/components/layout/Sidebar";
import ArticleCard from "@/components/article/ArticleCard";
import CategoryFilter from "@/components/article/CategoryFilter";
import SearchForm from "@/components/search/SearchForm";
import AdSlot from "@/components/ads/AdSlot";
import { getAllArticles, getCategoriesWithCounts } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "All Articles",
  description:
    "Browse every FinanceBlogg explainer on budgeting, banking, credit, saving, mutual funds, insurance and tax in India.",
  path: "/blog",
});

export default function BlogIndexPage() {
  const articles = getAllArticles();
  const categories = getCategoriesWithCounts().filter((c) => c.count > 0);
  const firstBatch = articles.slice(0, 6);
  const rest = articles.slice(6);

  return (
    <>
      <PageHeader
        title="All articles"
        description="Educational explainers on money topics that matter to Indian households, newest first."
        breadcrumbs={[{ name: "All Articles" }]}
      >
        <div className="mt-6 max-w-xl">
          <SearchForm id="blog-search" showCategory />
        </div>
        <CategoryFilter categories={categories} />
      </PageHeader>

      <div className="container-page mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {articles.length === 0 ? (
            <p className="text-navy-600">No articles have been published yet.</p>
          ) : (
            <>
              <h2 className="sr-only">Articles</h2>
              <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
                {firstBatch.map((a) => (
                  <ArticleCard key={a.slug} article={a} />
                ))}
              </div>
              {rest.length > 0 && (
                <>
                  <AdSlot placement="listing" />
                  <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
                    {rest.map((a) => (
                      <ArticleCard key={a.slug} article={a} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <aside aria-label="Sidebar" className="hidden lg:block">
          <div className="sticky top-32">
            <Sidebar />
          </div>
        </aside>
      </div>
    </>
  );
}
