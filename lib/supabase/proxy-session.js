import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./config";
import { AUTH_COOKIE_OPTIONS, hardenAuthCookie, isSessionTooOld } from "@/lib/auth/session-policy";

/**
 * Refreshes the Supabase session cookies for an /admin request and returns
 * the verified JWT claims (or null). Based on the @supabase/ssr proxy
 * pattern; additionally signs out sessions older than the dashboard limit.
 */
export async function updateAdminSession(request) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return { response, claims: null, expired: false };

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, hardenAuthCookie(options));
        }
        for (const [key, value] of Object.entries(headers || {})) response.headers.set(key, value);
      },
    },
  });

  // Must run before anything else so a token refresh can be written back.
  const { data, error } = await supabase.auth.getClaims();
  let claims = !error && data?.claims?.sub ? data.claims : null;
  let expired = false;

  if (claims && isSessionTooOld(claims)) {
    await supabase.auth.signOut({ scope: "local" });
    claims = null;
    expired = true;
  }
  return { response, claims, expired };
}
