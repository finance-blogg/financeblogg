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
  name: "FinanceBlogg",
  shortName: "FinanceBlogg",
  tagline: "Clear, practical money explainers for Indian readers",
  description:
    "FinanceBlogg publishes educational articles on personal finance, banking, credit, saving, mutual funds, insurance and tax for readers in India. Educational content only, not personalised financial advice.",
  url: normaliseUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "")
  ),
  locale: "en_IN",
  language: "en-IN",
  timeZone: "Asia/Kolkata",

  ownerName: "Hadi",
  ownerLocation: "India",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "financeblogg2026@gmail.com",
  jurisdiction: "the courts of India",

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
