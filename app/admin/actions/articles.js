"use server";

import { authorizeAction } from "@/lib/auth/admin";
import { publicStoragePrefix } from "@/lib/supabase/config";
import { allMdxArticleRecords } from "@/lib/mdx-source";
import { getArticleForEdit, getEditorOptions, UUID_PATTERN } from "@/lib/cms/admin-data";
import { ADMIN_ARTICLE_COLUMNS, editorDataToRow, rowToEditorMeta, rowToEditorValues } from "@/lib/cms/editor-mapping";
import { INTENTS, validateArticleInput } from "@/lib/cms/validation";
import { invalidateArticles } from "@/lib/cms/revalidate";

const MDX_SLUGS = new Set(allMdxArticleRecords.map((a) => a.slug));

const istDateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  dateStyle: "medium",
  timeStyle: "short",
});

function dbErrorResult(error) {
  if (error.code === "23505") {
    return { ok: false, errors: { slug: "Another article already uses this URL slug." }, error: "Please fix the highlighted fields." };
  }
  if (error.code === "23503") return { ok: false, error: "The selected category or author no longer exists. Reload the page and choose again." };
  if (error.code === "23514" || error.code === "P0001") return { ok: false, error: error.message };
  if (error.code === "42501") return { ok: false, error: "The database refused this change because your account is not authorised." };
  console.error("[cms] article write failed:", error);
  return { ok: false, error: "The article could not be saved because of a database error. Your changes are still in the editor; try again." };
}

function publishedAtFor(existing, status, data) {
  if (status === "scheduled") return data.scheduledFor;
  if (status === "published") {
    // Keep the original publication date when updating or republishing; never invent one.
    if (existing?.first_published_at && existing.published_at && Date.parse(existing.published_at) <= Date.now()) {
      return existing.published_at;
    }
    return new Date().toISOString();
  }
  if (!existing) return null;
  if (existing.status === "scheduled") return existing.first_published_at || null;
  return existing.published_at || null;
}

function successMessage(intent, saved) {
  if (saved.status === "published") {
    return intent === "publish" ? `Published. The article is live at /blog/${saved.slug}.` : "Saved. The changes are live.";
  }
  if (saved.status === "scheduled") return `Scheduled for ${istDateTime.format(new Date(saved.published_at))} IST.`;
  if (intent === "unpublish") return "Unpublished. The article is no longer visible to the public.";
  return "Draft saved.";
}

/** Shared by the editor and the list's quick actions. */
async function persistArticle(supabase, existing, values, intent, expectedUpdatedAt) {
  if (!INTENTS.includes(intent)) return { ok: false, error: "Unknown action." };
  if (existing?.deleted_at) return { ok: false, error: "This article is in the trash. Restore it before editing." };

  const { categories, authors } = await getEditorOptions(supabase);
  const result = validateArticleInput(values, {
    intent,
    currentStatus: existing?.status,
    categories: categories.map((c) => c.slug),
    authors: authors.map((a) => a.slug),
    storagePrefix: publicStoragePrefix(),
  });
  if (!result.ok) {
    return { ok: false, errors: result.errors, warnings: result.warnings, error: "Please fix the highlighted fields." };
  }
  const data = result.data;

  if (existing?.first_published_at && data.slug !== existing.slug) {
    return { ok: false, errors: { slug: "The URL of an article that has been published cannot be changed." }, error: "Please fix the highlighted fields." };
  }
  if (MDX_SLUGS.has(data.slug) && existing?.source_type !== "mdx-import") {
    return {
      ok: false,
      errors: { slug: "An existing article file (content/articles) already uses this URL. Import it instead of creating a duplicate." },
      error: "Please fix the highlighted fields.",
    };
  }

  const row = { ...editorDataToRow(data), status: data.status, published_at: publishedAtFor(existing, data.status, data) };

  let saved;
  let error;
  if (existing) {
    let query = supabase.from("articles").update(row).eq("id", existing.id);
    if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
    ({ data: saved, error } = await query.select(ADMIN_ARTICLE_COLUMNS).maybeSingle());
    if (!error && !saved) {
      return {
        ok: false,
        conflict: true,
        error: "This article was changed in another tab or by another admin after you opened it. Copy your changes, reload the page, then apply them again.",
      };
    }
  } else {
    ({ data: saved, error } = await supabase.from("articles").insert(row).select(ADMIN_ARTICLE_COLUMNS).single());
  }
  if (error) return dbErrorResult(error);

  if (existing?.status === "published" || saved.status === "published") {
    invalidateArticles({
      slugs: [existing?.slug, saved.slug],
      categories: [existing?.category_slug, saved.category_slug],
      authors: [existing?.author_slug, saved.author_slug],
    });
  }

  return {
    ok: true,
    article: rowToEditorMeta(saved),
    values: rowToEditorValues(saved),
    warnings: result.warnings,
    message: successMessage(intent, saved),
  };
}

export async function saveArticle({ id = null, expectedUpdatedAt = null, values, intent }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { supabase } = auth.ctx;

  if (id !== null && !UUID_PATTERN.test(String(id))) return { ok: false, error: "Unknown article." };
  const existing = id ? await getArticleForEdit(supabase, id) : null;
  if (id && !existing) return { ok: false, error: "This article no longer exists." };

  return persistArticle(supabase, existing, values, intent, expectedUpdatedAt);
}

/** Publish or unpublish from the article list, using the saved content. */
export async function changeArticleStatus({ id, intent, factCheckConfirmed = false }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  if (!["publish", "unpublish"].includes(intent)) return { ok: false, error: "Unknown action." };

  const existing = await getArticleForEdit(auth.ctx.supabase, id);
  if (!existing) return { ok: false, error: "This article no longer exists." };

  const values = { ...rowToEditorValues(existing), factCheckConfirmed: factCheckConfirmed === true };
  const result = await persistArticle(auth.ctx.supabase, existing, values, intent, existing.updated_at);
  if (!result.ok && result.errors) {
    const problems = Object.values(result.errors).join(" ");
    return { ok: false, error: `This article is not ready to publish: ${problems} Open the editor to fix it.` };
  }
  return result;
}

export async function trashArticle({ id }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { supabase } = auth.ctx;
  const existing = await getArticleForEdit(supabase, id);
  if (!existing) return { ok: false, error: "This article no longer exists." };
  if (existing.deleted_at) return { ok: true, message: "Already in the trash." };

  // Trashed articles come back as drafts, so restoring never republishes by surprise.
  const update = { deleted_at: new Date().toISOString() };
  if (existing.status !== "draft") {
    update.status = "draft";
    update.published_at = existing.status === "scheduled" ? existing.first_published_at || null : existing.published_at;
  }
  const { error } = await supabase.from("articles").update(update).eq("id", id);
  if (error) return dbErrorResult(error);
  if (existing.status === "published") {
    invalidateArticles({ slugs: [existing.slug], categories: [existing.category_slug], authors: [existing.author_slug] });
  }
  return { ok: true, message: `Moved “${existing.title}” to the trash. It is no longer public and can be restored as a draft.` };
}

export async function restoreArticle({ id }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { data, error } = await auth.ctx.supabase
    .from("articles")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("title")
    .maybeSingle();
  if (error) return dbErrorResult(error);
  if (!data) return { ok: false, error: "This article is not in the trash." };
  return { ok: true, message: `Restored “${data.title}” as a draft.` };
}

export async function deleteArticlePermanently({ id }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { data, error } = await auth.ctx.supabase
    .from("articles")
    .delete()
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("title")
    .maybeSingle();
  if (error) return dbErrorResult(error);
  if (!data) return { ok: false, error: "Only articles in the trash can be deleted permanently." };
  return { ok: true, message: `Deleted “${data.title}” permanently, including its revision history.` };
}

/** Loads an old revision into the editor as unsaved changes (nothing is written). */
export async function loadRevision({ articleId, revisionId }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  if (!UUID_PATTERN.test(String(articleId)) || !Number.isInteger(Number(revisionId))) return { ok: false, error: "Unknown revision." };
  const { data, error } = await auth.ctx.supabase
    .from("article_revisions")
    .select("snapshot,created_at,action")
    .eq("id", Number(revisionId))
    .eq("article_id", articleId)
    .maybeSingle();
  if (error) return dbErrorResult(error);
  if (!data) return { ok: false, error: "Revision not found." };
  return { ok: true, values: rowToEditorValues(data.snapshot), createdAt: data.created_at };
}

/** Stores the editor's current (unsaved) content for a private preview. */
export async function createPreview({ id = null, values, status = "draft", publishedAt = null }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { supabase, user } = auth.ctx;

  const { data } = validateArticleInput(values, { intent: "save", storagePrefix: publicStoragePrefix() });
  const payload = { values: data, status: ["draft", "scheduled", "published"].includes(status) ? status : "draft", publishedAt };

  await supabase.from("article_previews").delete().lt("expires_at", new Date().toISOString());
  const { data: preview, error } = await supabase
    .from("article_previews")
    .insert({ payload, article_id: id && UUID_PATTERN.test(String(id)) ? id : null, created_by: user.id })
    .select("id")
    .single();
  if (error) return dbErrorResult(error);
  return { ok: true, url: `/admin/preview/draft/${preview.id}` };
}

/** Publishes scheduled articles whose time has passed (manual fallback for the cron job). */
export async function publishDueArticles() {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { data, error } = await auth.ctx.supabase
    .from("articles")
    .update({ status: "published" })
    .eq("status", "scheduled")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .select("slug,category_slug,author_slug");
  if (error) return dbErrorResult(error);
  if (data.length) {
    invalidateArticles({ slugs: data.map((a) => a.slug), categories: data.map((a) => a.category_slug), authors: data.map((a) => a.author_slug) });
  }
  return { ok: true, message: data.length ? `Published ${data.length} scheduled article(s).` : "No scheduled articles were due." };
}
