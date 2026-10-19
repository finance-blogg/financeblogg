import { SLUG_PATTERN } from "./slug.js";

function line(value, max) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max + 1);
}

function list(value, maxItems, maxLength) {
  const items = Array.isArray(value) ? value : String(value || "").split(/\r?\n|,/);
  return [...new Set(items.map((v) => line(v, maxLength)).filter(Boolean))].slice(0, maxItems + 1);
}

export function validateCategoryInput(input) {
  const errors = {};
  const data = {
    slug: line(input?.slug, 80).toLowerCase(),
    name: line(input?.name, 80),
    shortName: line(input?.shortName, 40),
    description: line(input?.description, 300),
    sortOrder: Number.parseInt(input?.sortOrder, 10),
  };
  if (!SLUG_PATTERN.test(data.slug) || data.slug.length > 80) errors.slug = "Use lowercase letters, numbers and single hyphens.";
  if (!data.name) errors.name = "Add a name.";
  if (data.name.length > 80) errors.name = "Keep the name under 80 characters.";
  if (data.shortName.length > 40) errors.shortName = "Keep the short name under 40 characters.";
  if (data.description.length > 300) errors.description = "Keep the description under 300 characters.";
  if (!Number.isFinite(data.sortOrder) || data.sortOrder < -1000 || data.sortOrder > 100000) data.sortOrder = 100;
  return { ok: Object.keys(errors).length === 0, errors, data };
}

const LINK_KEYS = ["website", "linkedin", "twitter", "x"];

export function validateAuthorInput(input) {
  const errors = {};
  const links = {};
  for (const key of LINK_KEYS) {
    const value = line(input?.links?.[key], 300);
    if (!value) continue;
    if (!/^https:\/\/\S+$/.test(value)) errors[`links.${key}`] = "Profile links must be full https:// URLs.";
    else links[key] = value;
  }
  const data = {
    slug: line(input?.slug, 80).toLowerCase(),
    name: line(input?.name, 120),
    role: line(input?.role, 120),
    bio: String(input?.bio ?? "").trim().slice(0, 2001),
    expertise: list(input?.expertise, 30, 80),
    credentials: list(input?.credentials, 20, 200),
    links,
    isOrganization: input?.isOrganization === true,
  };
  if (!SLUG_PATTERN.test(data.slug) || data.slug.length > 80) errors.slug = "Use lowercase letters, numbers and single hyphens.";
  if (!data.name) errors.name = "Add a name.";
  if (data.name.length > 120) errors.name = "Keep the name under 120 characters.";
  if (data.role.length > 120) errors.role = "Keep the role under 120 characters.";
  if (data.bio.length > 2000) errors.bio = "Keep the bio under 2,000 characters.";
  if (data.expertise.length > 30) errors.expertise = "List at most 30 topics.";
  if (data.credentials.length > 20) errors.credentials = "List at most 20 credentials.";
  return { ok: Object.keys(errors).length === 0, errors, data };
}
