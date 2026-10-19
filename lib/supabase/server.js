import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./config";
import { AUTH_COOKIE_OPTIONS, hardenAuthCookie } from "@/lib/auth/session-policy";

/**
 * Supabase client bound to the current request's auth cookies, following the
 * @supabase/ssr guide for the Next.js App Router. Create one per request.
 * Queries run as the signed-in user, so Row Level Security applies.
 */
export async function createServerSupabase() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, hardenAuthCookie(options));
          }
        } catch {
          // Server Components cannot set cookies. proxy.js refreshes the
          // session before rendering, so this is safe to ignore here.
        }
      },
    },
  });
}
