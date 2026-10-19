/**
 * Session rules shared by proxy.js and the server-side admin checks.
 *
 * Supabase refreshes access tokens (default lifetime: 1 hour) using a refresh
 * token. On top of that, the dashboard enforces an absolute limit counted
 * from the moment the admin signed in, so a stolen or forgotten session
 * cannot be kept alive forever. Default 12 hours; override with
 * ADMIN_SESSION_MAX_HOURS (1 to 168).
 */

const DEFAULT_HOURS = 12;

export function sessionMaxAgeSeconds() {
  const hours = Number(process.env.ADMIN_SESSION_MAX_HOURS);
  const valid = Number.isFinite(hours) && hours >= 1 && hours <= 168 ? hours : DEFAULT_HOURS;
  return Math.round(valid * 3600);
}

/** Seconds since epoch when the user authenticated, from the JWT `amr` claim. */
export function signedInAt(claims) {
  const stamps = Array.isArray(claims?.amr)
    ? claims.amr.map((entry) => Number(entry?.timestamp)).filter((t) => Number.isFinite(t) && t > 0)
    : [];
  if (stamps.length) return Math.max(...stamps);
  const iat = Number(claims?.iat);
  return Number.isFinite(iat) ? iat : null;
}

export function isSessionTooOld(claims, nowSeconds = Math.floor(Date.now() / 1000)) {
  const at = signedInAt(claims);
  if (!at) return true;
  return nowSeconds - at > sessionMaxAgeSeconds();
}

/** Cookie attributes for Supabase auth cookies: not readable by JavaScript, HTTPS-only in production. */
export function hardenAuthCookie(options = {}) {
  const maxAge = sessionMaxAgeSeconds();
  return {
    ...options,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: options.maxAge === 0 ? 0 : Math.min(Number(options.maxAge) || maxAge, maxAge),
  };
}

export const AUTH_COOKIE_OPTIONS = { path: "/", httpOnly: true, sameSite: "lax" };
