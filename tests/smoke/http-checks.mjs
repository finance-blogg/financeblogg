#!/usr/bin/env node
/**
 * HTTP smoke checks against a running production server:
 *   npm run build && npx next start -p 3100
 *   node tests/smoke/http-checks.mjs http://localhost:3100
 *
 * Checks public routes, admin protection, security headers and the cron
 * endpoint. Exits non-zero on the first failed group.
 */
const base = (process.argv[2] || "http://localhost:3100").replace(/\/$/, "");
let failures = 0;

async function get(path, options = {}) {
  return fetch(`${base}${path}`, { redirect: "manual", ...options });
}

function check(label, ok, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

const publicPages = [
  "/",
  "/blog",
  "/blog/how-to-read-a-bank-statement",
  "/category/banking",
  "/authors/editorial-team",
  "/about",
  "/search?q=sip",
  "/sitemap.xml",
  "/rss.xml",
  "/robots.txt",
  "/blog/how-to-read-a-bank-statement/opengraph-image",
];
for (const path of publicPages) {
  const res = await get(path);
  check(`GET ${path} → 200`, res.status === 200, `got ${res.status}`);
}

for (const path of ["/blog/does-not-exist", "/blog/page/99", "/category/not-a-category", "/blog/page"]) {
  const res = await get(path);
  check(`GET ${path} → 404`, res.status === 404, `got ${res.status}`);
}

{
  const res = await get("/blog/page/1");
  check("GET /blog/page/1 redirects to /blog", [307, 308].includes(res.status) && res.headers.get("location")?.endsWith("/blog"), `${res.status} ${res.headers.get("location")}`);
}

{
  const html = await (await get("/blog/how-to-read-a-bank-statement")).text();
  check("article has canonical URL", /<link rel="canonical" href="[^"]+\/blog\/how-to-read-a-bank-statement"/.test(html));
  check("article has og:image at the original URL", /property="og:image" content="[^"]+\/blog\/how-to-read-a-bank-statement\/opengraph-image"/.test(html));
  check("article has Article structured data", html.includes('"@type":"Article"'));
  check("article has breadcrumb structured data", html.includes('"@type":"BreadcrumbList"'));
  check("article keeps its key takeaways box", html.includes('aria-label="Key takeaways"'));
  check("article has no admin links", !html.includes("/admin"));
}

{
  const sitemap = await (await get("/sitemap.xml")).text();
  check("sitemap lists articles", sitemap.includes("/blog/how-to-read-a-bank-statement"));
  check("sitemap excludes admin", !sitemap.includes("/admin"));
  const robots = await (await get("/robots.txt")).text();
  check("robots.txt disallows /admin", /Disallow: \/admin/.test(robots));
}

for (const path of ["/admin", "/admin/articles", "/admin/articles/new", "/admin/media", "/admin/categories", "/admin/settings", "/admin/articles/00000000-0000-4000-8000-000000000000/edit", "/admin/preview/article/00000000-0000-4000-8000-000000000000"]) {
  const res = await get(path);
  const location = res.headers.get("location") || "";
  check(`GET ${path} without a session redirects to login`, [302, 303, 307].includes(res.status) && location.includes("/admin/login"), `${res.status} ${location}`);
  check(`GET ${path} sends noindex and no-store`, (res.headers.get("x-robots-tag") || "").includes("noindex") && (res.headers.get("cache-control") || "").includes("no-store"));
}

{
  const res = await get("/admin/articles?status=draft");
  const location = new URL(res.headers.get("location") || "/", base);
  check("login redirect keeps the requested page as next=", location.searchParams.get("next") === "/admin/articles?status=draft", location.search);
}

{
  const res = await get("/admin/login");
  const html = await res.text();
  check("GET /admin/login → 200", res.status === 200, `got ${res.status}`);
  check("login page is noindex", /<meta name="robots" content="noindex, nofollow/.test(html));
  check("login page loads no AdSense", !html.includes("adsbygoogle") && !html.includes("google-adsense-account"));
  check("login page has no public header", !html.includes('aria-label="Primary"'));
  check("admin pages deny framing", res.headers.get("x-frame-options") === "DENY" && (res.headers.get("content-security-policy") || "").includes("frame-ancestors 'none'"));
}

{
  const res = await get("/api/cron/publish-scheduled");
  check("cron endpoint refuses requests without configuration or secret", [401, 503].includes(res.status), `got ${res.status}`);
  const bad = await get("/api/cron/publish-scheduled", { headers: { Authorization: "Bearer wrong-secret-value-123" } });
  check("cron endpoint rejects a wrong secret", [401, 503].includes(bad.status), `got ${bad.status}`);
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll HTTP checks passed.");
process.exit(failures ? 1 : 0);
