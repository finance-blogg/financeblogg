import Link from "next/link";
import ActionButton from "@/components/admin/ActionButton";
import { AdminPageHeader, Card, Notice, StatusBadge, button, cx, formatDateTime } from "@/components/admin/ui";
import { publishDueArticles } from "@/app/admin/actions/articles";
import { requireAdmin } from "@/lib/auth/admin";
import { countArticlesByStatus } from "@/lib/cms/admin-data";
import { ADMIN_LIST_COLUMNS } from "@/lib/cms/editor-mapping";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { mdxArticles, mdxArticlesEnabled } from "@/lib/mdx-source";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase } = await requireAdmin();
  const [counts, recent, upcoming, imported] = await Promise.all([
    countArticlesByStatus(supabase),
    supabase.from("articles").select(ADMIN_LIST_COLUMNS).is("deleted_at", null).order("updated_at", { ascending: false }).limit(6),
    supabase
      .from("articles")
      .select(ADMIN_LIST_COLUMNS)
      .is("deleted_at", null)
      .eq("status", "scheduled")
      .order("published_at", { ascending: true })
      .limit(5),
    supabase.rpc("mdx_import_slugs"),
  ]);
  if (recent.error || upcoming.error) throw new Error("[cms] could not load the dashboard");
  const importedSlugs = new Set((imported.data || []).map((r) => (typeof r === "string" ? r : r.mdx_import_slugs)));
  const fileArticles = mdxArticlesEnabled ? mdxArticles.filter((a) => !importedSlugs.has(a.slug)).length : 0;

  const cronReady = Boolean(process.env.CRON_SECRET) && isServiceRoleConfigured();
  const stats = [
    { label: "Published", value: counts.published, href: "/admin/articles?status=published" },
    { label: "Drafts", value: counts.draft, href: "/admin/articles?status=draft" },
    { label: "Scheduled", value: counts.scheduled, href: "/admin/articles?status=scheduled" },
    { label: "In trash", value: counts.trash, href: "/admin/articles?status=trash" },
  ];

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Write, review and publish articles. Changes to published articles go live as soon as you save them."
        actions={
          <Link href="/admin/articles/new" className={cx(button.base, button.primary)}>
            New article
          </Link>
        }
      />

      {counts.overdue > 0 && (
        <Notice tone="warning" title={`${counts.overdue} scheduled article(s) are past their publication time`} className="mb-6">
          <p>
            The scheduled-publishing job has not published them yet.{" "}
            {cronReady ? "It may run later (see Settings for its frequency)." : "The job is not configured (see Settings)."} You can publish
            them now:
          </p>
          <div className="mt-2">
            <ActionButton action={publishDueArticles} payload={{}} label="Publish due articles now" variant="publish" size="normal" />
          </div>
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm hover:border-leaf-500">
            <p className="text-sm text-navy-600">{s.label}</p>
            <p className="mt-1 font-serif text-3xl font-semibold text-navy-950">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Recently edited">
          {recent.data.length === 0 ? (
            <p className="text-sm text-navy-600">
              No articles in the database yet. <Link href="/admin/articles/new" className="link-underline">Write the first one</Link>.
            </p>
          ) : (
            <ul className="divide-y divide-navy-50">
              {recent.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/articles/${a.id}/edit`} className="min-w-0 truncate text-sm font-medium text-navy-900 hover:text-leaf-700">
                    {a.title}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={a.status} />
                    <span className="hidden text-xs text-navy-500 sm:inline">{formatDateTime(a.updated_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Scheduled">
          {upcoming.data.length === 0 ? (
            <p className="text-sm text-navy-600">Nothing is scheduled.</p>
          ) : (
            <ul className="divide-y divide-navy-50">
              {upcoming.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/articles/${a.id}/edit`} className="min-w-0 truncate text-sm font-medium text-navy-900 hover:text-leaf-700">
                    {a.title}
                  </Link>
                  <span className="shrink-0 text-xs text-navy-500">{formatDateTime(a.published_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Before you publish" className="mt-6">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-navy-700">
          <li>Fact-check every figure, interest rate, tax rule and regulation against the current official source (RBI, SEBI, IRDAI, Income Tax Department, CBIC).</li>
          <li>Say which year or date a figure applies to, and link to the source in the Sources section.</li>
          <li>Label examples as illustrative. Do not invent quotes, credentials, sources or publication dates.</li>
        </ul>
      </Card>

      {fileArticles > 0 && (
        <p className="mt-6 text-xs text-navy-500">
          {fileArticles} older article(s) are still served from MDX files in content/articles and are not editable here. See
          “Migrating existing articles” in the README.
        </p>
      )}
    </>
  );
}
