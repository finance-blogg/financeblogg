import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleEditor from "@/components/admin/ArticleEditor";
import ActionButton from "@/components/admin/ActionButton";
import { AdminPageHeader, Notice } from "@/components/admin/ui";
import { restoreArticle } from "@/app/admin/actions/articles";
import { requireAdmin } from "@/lib/auth/admin";
import { getArticleForEdit, getEditorOptions, getRevisions } from "@/lib/cms/admin-data";
import { rowToEditorMeta, rowToEditorValues } from "@/lib/cms/editor-mapping";
import { publicStoragePrefix } from "@/lib/supabase/config";

export const metadata = { title: "Edit article" };

export default async function EditArticlePage({ params, searchParams }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const { saved } = await searchParams;
  const row = await getArticleForEdit(supabase, id);
  if (!row) notFound();

  if (row.deleted_at) {
    return (
      <>
        <AdminPageHeader title={row.title} />
        <Notice tone="warning" title="This article is in the trash">
          <p>Restore it to edit it. It will come back as a draft.</p>
          <div className="mt-3 flex gap-3">
            <ActionButton action={restoreArticle} payload={{ id: row.id }} label="Restore as draft" variant="primary" size="normal" />
            <Link href="/admin/articles?status=trash" className="self-center text-sm underline">
              Back to the trash
            </Link>
          </div>
        </Notice>
      </>
    );
  }

  const [{ categories, authors }, revisions] = await Promise.all([getEditorOptions(supabase), getRevisions(supabase, id)]);

  return (
    <>
      <AdminPageHeader
        title="Edit article"
        description={row.source_type === "mdx-import" ? "Imported from an MDX file. The database copy now replaces the file on the public site." : undefined}
      />
      <ArticleEditor
        key={row.id}
        initialValues={rowToEditorValues(row)}
        initialMeta={rowToEditorMeta(row)}
        categories={categories}
        authors={authors}
        revisions={revisions}
        storagePrefix={publicStoragePrefix()}
        notice={saved === "1" ? "Saved. You can keep editing here." : ""}
      />
    </>
  );
}
