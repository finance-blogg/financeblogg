const FALLBACK = "/admin";

/**
 * Returns a safe in-dashboard path for post-login redirects. Anything that is
 * not a same-origin /admin path (absolute URLs, protocol-relative "//host",
 * backslash tricks, encoded control characters, the login page itself) falls
 * back to /admin, which prevents open redirects.
 */
export function safeAdminPath(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return FALLBACK;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return FALLBACK;
  if (/[\u0000-\u001f\u007f]/.test(value)) return FALLBACK;

  let url;
  try {
    url = new URL(value, "https://admin.invalid");
  } catch {
    return FALLBACK;
  }
  if (url.origin !== "https://admin.invalid") return FALLBACK;
  if (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) return FALLBACK;
  if (url.pathname === "/admin/login" || url.pathname.startsWith("/admin/login/")) return FALLBACK;
  return `${url.pathname}${url.search}`;
}
