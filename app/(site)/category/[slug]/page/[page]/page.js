import { notFound, permanentRedirect } from "next/navigation";
import CategoryListing from "@/components/article/CategoryListing";
import { getArticlesPage, getCategories, getCategory } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const ensureStatic = "navigation";
export const instant = false;

function parsePage(value) {
  return /^[1-9]\d{0,3}$/.test(value) ? Number(value) : null;
}

export async function generateStaticParams() {
  const categories = await getCategories();
  const params = [];
  for (const c of categories) {
    const { totalPages } = await getArticlesPage({ page: 1, category: c.slug });
    for (let p = 2; p <= totalPages; p += 1) params.push({ slug: c.slug, page: String(p) });
  }
  // Cache Components needs at least one complete param set; this one redirects to page 1.
  return params.length ? params : categories.slice(0, 1).map((c) => ({ slug: c.slug, page: "1" }));
}

export async function generateMetadata({ params }) {
  const { slug, page: raw } = await params;
  const page = parsePage(raw);
  const category = await getCategory(slug);
  if (!category || !page) return { title: "Page not found", robots: { index: false } };
  return pageMetadata({
    title: `${category.name} Articles: Page ${page}`,
    description: category.description,
    path: `/category/${category.slug}/page/${page}`,
  });
}

export default async function CategoryPaginatedPage({ params }) {
  const { slug, page: raw } = await params;
  const page = parsePage(raw);
  const category = await getCategory(slug);
  if (!category) notFound();
  if (page === 1) permanentRedirect(`/category/${category.slug}`);
  if (!page) notFound();
  const { exists } = await getArticlesPage({ page, category: category.slug });
  if (!exists) notFound();
  return <CategoryListing category={category} page={page} />;
}
