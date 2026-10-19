import Link from "next/link";
import ArticleRowActions from "@/components/admin/ArticleRowActions";
import { AdminPageHeader, Notice, StatusBadge, button, cx, formatDateTime, inputClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getEditorOptions, listArticles, parseListParams } from "@/lib/cms/admin-data";

export const metadata = { title: "Articles" };

function pageLink(params, page) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, page })) {
    if (v && !(k === "page" && v === 1) && !(k === "sort" && v === "updated-desc")) query.set(k, String(v));
  }
  const qs = query.toString();
  return `/admin/articles${qs ? `?${qs}` : ""}`;
}

export default async function ArticlesPage({ searchParams }) {
  const { supabase } = await requireAdmin();
  const params = parseListParams(await searchParams);
  const [{ articles, total, totalPages }, { categories }] = await Promise.all([listArticles(supabase, params), getEditorOptions(supabase)]);
  const categoryName = new Map(categories.map((c) => [c.slug, c.name]));
  const filtered = params.q || params.category || params.status;

  return (
    <>
      <AdminPageHeader
        title="Articles"
        description="Articles stored in the database. Older MDX articles appear here after they are imported."
        actions={
          <Link href="/admin/articles/new" className={cx(button.base, button.primary)}>
            New article
          </Link>
        }
      />

      <form method="get" className="mb-6 grid gap-3 rounded-lg border border-navy-100 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="q" className="sr-only">
            Search by title
          </label>
          <input id="q" name="q" type="search" placeholder="Search by title" defaultValue={params.q} maxLength={100} className={inputClass} />
        </div>
        <div>
          <label htmlFor="category" className="sr-only">
            Category
          </label>
          <select id="category" name="category" defaultValue={params.category} className={inputClass}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="sr-only">
            Status
          </label>
          <select id="status" name="status" defaultValue={params.status} className={inputClass}>
            <option value="">All statuses</option>
            <option value="draft">Drafts</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="trash">Trash</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="sr-only">
            Sort
          </label>
          <select id="sort" name="sort" defaultValue={params.sort} className={inputClass}>
            <option value="updated-desc">Recently updated</option>
            <option value="updated-asc">Least recently updated</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className={cx(button.base, button.primary)}>
            Filter
          </button>
          {filtered && (
            <Link href="/admin/articles" className={cx(button.base, button.ghost)}>
              Reset
            </Link>
          )}
        </div>
      </form>

      {articles.length === 0 ? (
        <Notice>{filtered ? "No articles match these filters." : "No articles yet. Create one to get started."}</Notice>
      ) : (
        <div className="overflow-hidden rounded-lg border border-navy-100 bg-white shadow-sm">
          <p className="border-b border-navy-100 px-4 py-2 text-xs text-navy-500">
            {total} article{total === 1 ? "" : "s"}
            {params.status === "trash" && " in the trash. Trashed articles are hidden from the public site."}
          </p>
          <ul className="divide-y divide-navy-100">
            {articles.map((a) => (
              <li key={a.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={a.status} deleted={Boolean(a.deleted_at)} />
                    {a.featured && <span className="text-xs font-semibold text-leaf-700">Featured</span>}
                    {a.fact_check_status !== "verified" && !a.deleted_at && <span className="text-xs text-amber-800">Fact-check pending</span>}
                  </div>
                  <Link href={`/admin/articles/${a.id}/edit`} className="mt-1 block font-serif text-lg font-semibold text-navy-950 hover:text-leaf-700">
                    {a.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-navy-500">
                    /blog/{a.slug} · {categoryName.get(a.category_slug) || "No category"} · Updated {formatDateTime(a.updated_at)}
                    {a.status === "scheduled" && a.published_at && <> · Publishes {formatDateTime(a.published_at)}</>}
                  </p>
                </div>
                <ArticleRowActions article={a} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          {params.page > 1 ? (
            <Link href={pageLink(params, params.page - 1)} className={cx(button.base, button.secondary)}>
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-navy-600">
            Page {params.page} of {totalPages}
          </span>
          {params.page < totalPages ? (
            <Link href={pageLink(params, params.page + 1)} className={cx(button.base, button.secondary)}>
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
