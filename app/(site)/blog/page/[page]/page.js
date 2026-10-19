import { notFound, permanentRedirect } from "next/navigation";
import BlogListing from "@/components/article/BlogListing";
import { getArticlesPage } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const ensureStatic = "navigation";
export const instant = false;

function parsePage(value) {
  return /^[1-9]\d{0,3}$/.test(value) ? Number(value) : null;
}

export async function generateStaticParams() {
  const { totalPages } = await getArticlesPage({ page: 1 });
  const params = Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({ page: String(i + 2) }));
  // Cache Components needs at least one param; page 1 redirects to /blog.
  return params.length ? params : [{ page: "1" }];
}

export async function generateMetadata({ params }) {
  const page = parsePage((await params).page);
  if (!page) return { title: "Page not found", robots: { index: false } };
  return pageMetadata({
    title: `All Articles: Page ${page}`,
    description: `Page ${page} of every FinanceBlogg explainer, newest first.`,
    path: `/blog/page/${page}`,
  });
}

export default async function BlogPaginatedPage({ params }) {
  const page = parsePage((await params).page);
  if (page === 1) permanentRedirect("/blog");
  if (!page) notFound();
  const { exists } = await getArticlesPage({ page });
  if (!exists) notFound();
  return <BlogListing page={page} />;
}
