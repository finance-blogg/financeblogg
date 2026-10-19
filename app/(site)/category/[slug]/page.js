import { notFound } from "next/navigation";
import CategoryListing from "@/components/article/CategoryListing";
import { getArticlesByCategory, getCategories, getCategory } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category not found", robots: { index: false } };
  const count = (await getArticlesByCategory(slug)).length;
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
  const category = await getCategory(slug);
  if (!category) notFound();
  return <CategoryListing category={category} page={1} />;
}
