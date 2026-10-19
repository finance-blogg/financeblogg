import { NextResponse } from "next/server";
import { updateAdminSession } from "@/lib/supabase/proxy-session";

/**
 * Runs only for /admin. Refreshes the Supabase session and sends visitors
 * without a valid session to the login page. This is a convenience layer:
 * every admin page, Server Action and database query checks authorisation
 * again on the server (lib/auth/admin.js and Row Level Security).
 */
export async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const { response, claims, expired } = await updateAdminSession(request);
  const isLogin = pathname === "/admin/login";

  let result = response;
  if (!claims && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    const hadSession = request.cookies.getAll().some((c) => /^sb-.+-auth-token/.test(c.name));
    if (expired || hadSession) url.searchParams.set("reason", "expired");
    if (pathname !== "/admin") url.searchParams.set("next", `${pathname}${search}`);
    result = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) result.cookies.set(cookie);
  }

  result.headers.set("Cache-Control", "private, no-store, max-age=0");
  result.headers.set("X-Robots-Tag", "noindex, nofollow");
  return result;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
