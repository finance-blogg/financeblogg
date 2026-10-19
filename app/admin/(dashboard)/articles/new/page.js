import ArticleEditor from "@/components/admin/ArticleEditor";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getEditorOptions } from "@/lib/cms/admin-data";
import { EMPTY_EDITOR_VALUES } from "@/lib/cms/editor-mapping";
import { publicStoragePrefix } from "@/lib/supabase/config";

export const metadata = { title: "New article" };

export default async function NewArticlePage() {
  const { supabase } = await requireAdmin();
  const { categories, authors } = await getEditorOptions(supabase);
  const defaultAuthor = authors.length === 1 ? authors[0].slug : "";

  return (
    <>
      <AdminPageHeader title="New article" description="Drafts are private until you publish them." />
      <ArticleEditor
        initialValues={{ ...EMPTY_EDITOR_VALUES, authorSlug: defaultAuthor }}
        categories={categories}
        authors={authors}
        storagePrefix={publicStoragePrefix()}
      />
    </>
  );
}
