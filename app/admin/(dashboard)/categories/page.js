import CategoryManager from "@/components/admin/CategoryManager";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getEditorOptions } from "@/lib/cms/admin-data";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { supabase } = await requireAdmin();
  const [{ categories }, usage] = await Promise.all([
    getEditorOptions(supabase),
    supabase.from("articles").select("category_slug").is("deleted_at", null),
  ]);
  if (usage.error) throw new Error("[cms] could not count category usage");
  const counts = {};
  for (const row of usage.data) if (row.category_slug) counts[row.category_slug] = (counts[row.category_slug] || 0) + 1;

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Categories appear in the site header, footer and category pages. Their URLs cannot be changed after creation, so existing links keep working."
      />
      <CategoryManager categories={categories} counts={counts} />
    </>
  );
}
