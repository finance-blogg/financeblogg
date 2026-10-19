import Link from "next/link";
import ArticleCard from "@/components/article/ArticleCard";
import AdSlot from "@/components/ads/AdSlot";
import NewsletterCta from "@/components/NewsletterCta";
import { getAllArticles, getCategoriesWithCounts } from "@/lib/content";

export default async function Sidebar({ excludeSlug }) {
  const [all, withCounts] = await Promise.all([getAllArticles(), getCategoriesWithCounts()]);
  const recent = all.filter((a) => a.slug !== excludeSlug).slice(0, 5);
  const categories = withCounts.filter((c) => c.count > 0);

  return (
    <div className="space-y-10">
      {recent.length > 0 && (
        <section aria-labelledby="sidebar-recent">
          <h2 id="sidebar-recent" className="border-b border-navy-100 pb-2 text-sm font-semibold tracking-wide text-navy-950 uppercase">
            Recent articles
          </h2>
          <ul className="mt-4 space-y-5">
            {recent.map((a) => (
              <li key={a.slug}>
                <ArticleCard article={a} variant="compact" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="sidebar-categories">
        <h2 id="sidebar-categories" className="border-b border-navy-100 pb-2 text-sm font-semibold tracking-wide text-navy-950 uppercase">
          Categories
        </h2>
        <ul className="mt-3 divide-y divide-navy-50 text-[0.95rem]">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/category/${c.slug}`} className="flex items-center justify-between py-2 text-navy-700 hover:text-leaf-700">
                <span>{c.name}</span>
                <span className="text-xs text-navy-400">{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <NewsletterCta />

      <AdSlot placement="sidebar" className="my-0" />
    </div>
  );
}
