import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Sidebar from "@/components/layout/Sidebar";
import ArticleCard from "@/components/article/ArticleCard";
import CategoryFilter from "@/components/article/CategoryFilter";
import AdSlot from "@/components/ads/AdSlot";
import { categories, getCategory } from "@/lib/categories";
import { getArticlesByCategory, getCategoriesWithCounts } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const ensureStatic = "navigation";
export const instant = false;

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: "Category not found", robots: { index: false } };
  const count = getArticlesByCategory(slug).length;
  return pageMetadata({
    title: `${category.name} Articles`,
    description: category.description,
    path: `/category/${category.slug}`,
    // Empty category pages are thin content; keep them out of the index until they have articles.
    noIndex: count === 0,
  });
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const articles = getArticlesByCategory(slug);
  const filterCategories = getCategoriesWithCounts().filter((c) => c.count > 0 || c.slug === slug);

  return (
    <>
      <PageHeader
        eyebrow="Category"
        title={category.name}
        description={category.description}
        breadcrumbs={[{ name: "All Articles", href: "/blog" }, { name: category.name }]}
      >
        <CategoryFilter categories={filterCategories} active={slug} />
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
