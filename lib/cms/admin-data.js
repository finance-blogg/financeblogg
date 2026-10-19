import "server-only";
import { ADMIN_ARTICLE_COLUMNS, ADMIN_LIST_COLUMNS } from "./editor-mapping";

/**
 * Read helpers for the dashboard. Each takes the signed-in admin's Supabase
 * client (from requireAdmin/authorizeAction), so Row Level Security applies.
 */

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ADMIN_PAGE_SIZE = 20;
export const STATUS_FILTERS = ["draft", "scheduled", "published", "trash"];

function fail(context, error) {
  throw new Error(`[cms] ${context}: ${error.message}`);
}

export async function getEditorOptions(supabase) {
  const [categories, authors] = await Promise.all([
    supabase.from("categories").select("slug,name,short_name,description,sort_order").order("sort_order").order("name"),
    supabase.from("authors").select("slug,name,role,bio,expertise,credentials,links,image_url,is_organization,updated_at").order("name"),
  ]);
  if (categories.error) fail("loading categories", categories.error);
  if (authors.error) fail("loading authors", authors.error);
  return { categories: categories.data, authors: authors.data };
}

export async function getArticleForEdit(supabase, id) {
  if (!UUID_PATTERN.test(String(id))) return null;
  const { data, error } = await supabase.from("articles").select(ADMIN_ARTICLE_COLUMNS).eq("id", id).maybeSingle();
  if (error) fail("loading the article", error);
  return data;
}

export async function getRevisions(supabase, articleId, limit = 25) {
  const { data, error } = await supabase
    .from("article_revisions")
    .select("id,action,status,title,created_at,created_by")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("loading revisions", error);
  return data;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function parseListParams(searchParams = {}) {
  const first = (v) => (Array.isArray(v) ? v[0] : v) || "";
  const page = Number.parseInt(first(searchParams.page), 10);
  const status = first(searchParams.status);
  const sort = first(searchParams.sort);
  return {
    q: first(searchParams.q).trim().slice(0, 100),
    category: first(searchParams.category).slice(0, 80),
    status: STATUS_FILTERS.includes(status) ? status : "",
    sort: sort === "updated-asc" ? "updated-asc" : "updated-desc",
    page: Number.isFinite(page) && page > 0 && page < 10000 ? page : 1,
  };
}

export async function listArticles(supabase, { q, category, status, sort, page }) {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  let query = supabase
    .from("articles")
    .select(ADMIN_LIST_COLUMNS, { count: "exact" })
    .order("updated_at", { ascending: sort === "updated-asc" })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  if (status === "trash") query = query.not("deleted_at", "is", null);
  else {
    query = query.is("deleted_at", null);
    if (status) query = query.eq("status", status);
  }
  if (category) query = query.eq("category_slug", category);
  if (q) query = query.ilike("title", `%${escapeLike(q)}%`);

  const { data, error, count } = await query;
  if (error) fail("listing articles", error);
  return { articles: data, total: count || 0, totalPages: Math.max(1, Math.ceil((count || 0) / ADMIN_PAGE_SIZE)) };
}

export async function countArticlesByStatus(supabase) {
  const head = (build) => build(supabase.from("articles").select("id", { count: "exact", head: true }));
  const results = await Promise.all([
    head((q) => q.is("deleted_at", null).eq("status", "draft")),
    head((q) => q.is("deleted_at", null).eq("status", "scheduled")),
    head((q) => q.is("deleted_at", null).eq("status", "published")),
    head((q) => q.not("deleted_at", "is", null)),
    head((q) => q.is("deleted_at", null).eq("status", "scheduled").lte("published_at", new Date().toISOString())),
  ]);
  for (const r of results) if (r.error) fail("counting articles", r.error);
  const [draft, scheduled, published, trash, overdue] = results.map((r) => r.count || 0);
  return { draft, scheduled, published, trash, overdue };
}

export async function listMedia(supabase, { page = 1, perPage = 24 } = {}) {
  const from = (page - 1) * perPage;
  const { data, error, count } = await supabase
    .from("media")
    .select("id,storage_path,public_url,alt_text,mime_type,size_bytes,width,height,original_filename,created_at,updated_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);
  if (error) fail("listing media", error);
  return { items: data, total: count || 0, totalPages: Math.max(1, Math.ceil((count || 0) / perPage)) };
}
