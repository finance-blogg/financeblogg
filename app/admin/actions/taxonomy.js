"use server";

import { authorizeAction } from "@/lib/auth/admin";
import { allMdxArticleRecords } from "@/lib/mdx-source";
import { validateAuthorInput, validateCategoryInput } from "@/lib/cms/taxonomy-validation";
import { invalidateArticles, invalidateAuthors, invalidateCategories } from "@/lib/cms/revalidate";

function fieldErrors(errors) {
  return { ok: false, errors, error: "Please fix the highlighted fields." };
}

export async function saveCategory({ originalSlug = null, values }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { supabase } = auth.ctx;

  const { ok, errors, data } = validateCategoryInput(values);
  if (!ok) return fieldErrors(errors);
  if (originalSlug && data.slug !== originalSlug) {
    return fieldErrors({ slug: "Category URLs cannot be changed once created, because existing links would break." });
  }

  const row = { name: data.name, short_name: data.shortName || data.name, description: data.description, sort_order: data.sortOrder };
  const { error } = originalSlug
    ? await supabase.from("categories").update(row).eq("slug", originalSlug)
    : await supabase.from("categories").insert({ ...row, slug: data.slug });
  if (error) {
    if (error.code === "23505") return fieldErrors({ slug: "A category with this URL already exists." });
    console.error("[cms] category save failed:", error.message);
    return { ok: false, error: "The category could not be saved." };
  }
  invalidateCategories();
  invalidateArticles({ categories: [data.slug] });
  return { ok: true, message: originalSlug ? "Category updated." : `Category created at /category/${data.slug}.` };
}

export async function deleteCategory({ slug }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { supabase } = auth.ctx;

  if (allMdxArticleRecords.some((a) => a.category === slug)) {
    return { ok: false, error: "Articles in content/articles still use this category, so it cannot be deleted." };
  }
  const { count } = await supabase.from("articles").select("id", { count: "exact", head: true }).eq("category_slug", slug);
  if (count) return { ok: false, error: `${count} article(s), including drafts or trash, use this category. Move them first.` };

  const { error } = await supabase.from("categories").delete().eq("slug", slug);
  if (error) return { ok: false, error: error.code === "23503" ? "Articles still use this category." : "The category could not be deleted." };
  invalidateCategories();
  return { ok: true, message: "Category deleted." };
}

export async function saveAuthor({ originalSlug = null, values }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { supabase } = auth.ctx;

  const { ok, errors, data } = validateAuthorInput(values);
  if (!ok) return fieldErrors(errors);
  if (originalSlug && data.slug !== originalSlug) {
    return fieldErrors({ slug: "Author URLs cannot be changed once created." });
  }

  const row = {
    name: data.name,
    role: data.role,
    bio: data.bio,
    expertise: data.expertise,
    credentials: data.credentials,
    links: data.links,
    is_organization: data.isOrganization,
  };
  const { error } = originalSlug
    ? await supabase.from("authors").update(row).eq("slug", originalSlug)
    : await supabase.from("authors").insert({ ...row, slug: data.slug });
  if (error) {
    if (error.code === "23505") return fieldErrors({ slug: "An author with this URL already exists." });
    console.error("[cms] author save failed:", error.message);
    return { ok: false, error: "The author could not be saved." };
  }
  invalidateAuthors();
  invalidateArticles({ authors: [data.slug] });
  return { ok: true, message: originalSlug ? "Author updated." : "Author created." };
}

export async function deleteAuthor({ slug }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { supabase } = auth.ctx;

  if (allMdxArticleRecords.some((a) => a.author === slug || a.review.reviewedBy === slug)) {
    return { ok: false, error: "Articles in content/articles still credit this author." };
  }
  const { count } = await supabase.from("articles").select("id", { count: "exact", head: true }).eq("author_slug", slug);
  if (count) return { ok: false, error: `${count} article(s) are credited to this author. Reassign them first.` };

  const { error } = await supabase.from("authors").delete().eq("slug", slug);
  if (error) return { ok: false, error: "The author could not be deleted." };
  invalidateAuthors();
  return { ok: true, message: "Author deleted." };
}
