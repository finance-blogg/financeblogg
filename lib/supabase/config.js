/**
 * Supabase configuration, read from environment variables.
 *
 * Public (embedded in the browser bundle at build time, safe to expose):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  (or the legacy NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *
 * Server-only (never prefix with NEXT_PUBLIC_):
 *   SUPABASE_SECRET_KEY  (or the legacy SUPABASE_SERVICE_ROLE_KEY)
 *
 * While the public values are missing, the site runs on local MDX files only
 * and the admin dashboard shows a "not configured" notice.
 */

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "");

export const supabasePublishableKey =
  clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function isSupabaseConfigured() {
  return Boolean(/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)/.test(supabaseUrl) && supabasePublishableKey);
}

/** Public URL prefix for objects in the article image bucket. */
export const MEDIA_BUCKET = "article-images";

export function publicStoragePrefix() {
  return supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/` : "";
}
