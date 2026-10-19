import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isSessionTooOld } from "./session-policy";

/**
 * Data Access Layer for the dashboard. Every admin page, Server Action and
 * route handler calls one of these before touching data, so protection does
 * not depend on proxy.js or on hiding buttons. Row Level Security in the
 * database enforces the same rule a second time.
 *
 * Status values: "ok", "unconfigured", "anonymous", "expired", "forbidden".
 */
export const getAdminContext = cache(async () => {
  // Session checks depend on the current time and must never run during a
  // prerender (including runtime prefetches), so mark this as request-time.
  await connection();
  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const supabase = await createServerSupabase();
  // getClaims() verifies the JWT signature (locally with asymmetric keys,
  // otherwise through the Auth server), unlike getSession().
  const { data, error } = await supabase.auth.getClaims();
  const claims = !error ? data?.claims : null;
  if (!claims?.sub) return { status: "anonymous" };
  if (isSessionTooOld(claims)) return { status: "expired" };

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id,email,display_name,disabled_at")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (adminError) throw new Error(`[auth] could not check administrator status: ${adminError.message}`);
  if (!admin || admin.disabled_at) return { status: "forbidden", email: claims.email || "" };

  return {
    status: "ok",
    supabase,
    user: { id: claims.sub, email: admin.email || claims.email || "", name: admin.display_name || "" },
  };
});

const LOGIN_REASONS = { anonymous: null, expired: "expired", forbidden: "unauthorized", unconfigured: "unconfigured" };

/** For admin pages: returns the context or redirects to the login page. */
export async function requireAdmin() {
  const ctx = await getAdminContext();
  if (ctx.status === "ok") return ctx;
  const reason = LOGIN_REASONS[ctx.status];
  redirect(reason ? `/admin/login?reason=${reason}` : "/admin/login");
}

const ACTION_MESSAGES = {
  unconfigured: "Supabase is not configured yet. See the README for setup steps.",
  anonymous: "Your session has ended. Sign in again to continue; unsaved changes are still in this tab.",
  expired: "Your session has expired. Sign in again to continue; unsaved changes are still in this tab.",
  forbidden: "This account is not authorised to manage the site.",
};

/**
 * For Server Actions: returns { ok: true, ctx } or { ok: false, result } where
 * `result` is a ready-to-return error payload. Actions never redirect on auth
 * failure so the editor can keep the user's unsaved work on screen.
 */
export async function authorizeAction() {
  const ctx = await getAdminContext();
  if (ctx.status === "ok") return { ok: true, ctx };
  return { ok: false, result: { ok: false, auth: ctx.status, error: ACTION_MESSAGES[ctx.status] } };
}
