import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Sidebar from "@/components/layout/Sidebar";
import ArticleCard from "@/components/article/ArticleCard";
import CategoryFilter from "@/components/article/CategoryFilter";
import Pagination from "@/components/article/Pagination";
import AdSlot from "@/components/ads/AdSlot";
import { getArticlesPage, getCategoriesWithCounts } from "@/lib/content";

export default async function CategoryListing({ category, page = 1 }) {
  const [{ articles, totalPages, page: current }, withCounts] = await Promise.all([
    getArticlesPage({ page, category: category.slug }),
    getCategoriesWithCounts(),
  ]);
  const filterCategories = withCounts.filter((c) => c.count > 0 || c.slug === category.slug);
  const basePath = `/category/${category.slug}`;

  return (
    <>
      <PageHeader
        eyebrow="Category"
        title={current > 1 ? `${category.name}: page ${current}` : category.name}
        description={category.description}
        breadcrumbs={[
          { name: "All Articles", href: "/blog" },
          ...(current > 1 ? [{ name: category.name, href: basePath }, { name: `Page ${current}` }] : [{ name: category.name }]),
        ]}
      >
        <CategoryFilter categories={filterCategories} active={category.slug} />
      </PageHeader>

      <div className="container-page mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {articles.length === 0 ? (
            <div className="rounded-lg border border-navy-100 bg-navy-50/60 p-8">
              <h2 className="font-serif text-xl font-semibold text-navy-950">No articles in this category yet</h2>
              <p className="mt-2 text-navy-600">
                We are working on explainers for this topic. In the meantime, browse{" "}
                <Link href="/blog" className="link-underline">all articles</Link>.
              </p>
            </div>
          ) : (
            <>
              <h2 className="sr-only">Articles in {category.name}</h2>
              <div className="space-y-10">
                {articles.map((a, i) => (
                  <div key={a.slug}>
                    <ArticleCard article={a} variant="horizontal" />
                    {i === 3 && articles.length > 5 && <AdSlot placement="listing" />}
                  </div>
                ))}
              </div>
              <Pagination basePath={basePath} page={current} totalPages={totalPages} />
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
