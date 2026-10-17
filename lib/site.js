/**
 * Central site configuration.
 *
 * Values marked OWNER_TODO must be completed by the site owner before launch.
 * `npm run check:launch` lists every remaining OWNER_TODO in the project.
 */

function normaliseUrl(value) {
  if (!value) return "http://localhost:3000";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

export const siteConfig = {
  name: "Rupee Ledger",
  shortName: "Rupee Ledger",
  tagline: "Clear, practical money explainers for Indian readers",
  description:
    "Rupee Ledger publishes educational articles on personal finance, banking, credit, saving, mutual funds, insurance and tax for readers in India. Educational content only, not personalised financial advice.",
  url: normaliseUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "")
  ),
  locale: "en_IN",
  language: "en-IN",
  timeZone: "Asia/Kolkata",

  // OWNER_TODO: Replace with the legal name of the person or entity that runs the site.
  ownerName: "[OWNER_TODO: Legal name of site owner or company]",
  // OWNER_TODO: Replace with a postal address or city/state if you are comfortable publishing it.
  ownerLocation: "[OWNER_TODO: City, State, India]",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  // OWNER_TODO: Confirm the governing-law jurisdiction with a qualified legal professional.
  jurisdiction: "[OWNER_TODO: e.g. courts of Mumbai, Maharashtra, India]",

  social: {
    // Add full profile URLs only for accounts you actually operate.
    twitter: "",
    linkedin: "",
    facebook: "",
  },

  newsletterUrl: process.env.NEXT_PUBLIC_NEWSLETTER_URL || "",
};

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export const isProduction = process.env.NODE_ENV === "production";
