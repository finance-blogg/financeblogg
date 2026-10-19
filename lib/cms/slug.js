export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 100;

/** Slugs that would clash with routes such as /blog/page/2 or look like system URLs. */
export const RESERVED_SLUGS = new Set(["page", "new", "edit", "feed", "rss", "admin", "api", "search", "preview", "draft"]);

export function slugify(value, max = SLUG_MAX) {
  const base = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= max) return base;
  const cut = base.slice(0, max);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > max / 2 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

export function isValidSlug(slug) {
  return typeof slug === "string" && slug.length <= SLUG_MAX && SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}
