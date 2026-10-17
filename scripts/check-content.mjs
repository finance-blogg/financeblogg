#!/usr/bin/env node
/**
 * Content and launch checks.
 *
 *   npm run check:content   Validate articles: frontmatter, images, internal links, headings.
 *   npm run check:launch    Also fail on OWNER_TODO markers, unverified articles and missing
 *                           production settings. Run this before going live.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const root = process.cwd();
const launchMode = process.argv.includes("--launch");

for (const file of [".env", ".env.production", ".env.local", ".env.production.local"]) {
  const full = path.join(root, file);
  if (fs.existsSync(full)) {
    try {
      process.loadEnvFile(full);
    } catch {
      // Ignore malformed env files here; Next.js will report them.
    }
  }
}

const errors = [];
const warnings = [];
const launchIssues = [];

const rel = (p) => path.relative(root, p).replaceAll("\\", "/");

function parse(file) {
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    errors.push(`${rel(file)}: missing frontmatter`);
    return null;
  }
  try {
    return { data: YAML.parse(match[1]) || {}, body: match[2] };
  } catch (e) {
    errors.push(`${rel(file)}: invalid YAML (${e.message})`);
    return null;
  }
}

const categoriesSource = fs.readFileSync(path.join(root, "lib", "categories.js"), "utf8");
const categorySlugs = new Set([...categoriesSource.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]));

const authorsDir = path.join(root, "content", "authors");
const authorSlugs = new Set(
  fs.readdirSync(authorsDir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => f.replace(/\.json$/, ""))
);

const articlesDir = path.join(root, "content", "articles");
const articleFiles = fs.readdirSync(articlesDir).filter((f) => f.endsWith(".mdx") && !f.startsWith("_"));
const articles = [];

for (const name of articleFiles) {
  const file = path.join(articlesDir, name);
  const parsed = parse(file);
  if (!parsed) continue;
  const { data, body } = parsed;
  const slug = data.slug || name.replace(/\.mdx$/, "");
  articles.push({ file, slug, data, body });

  for (const field of ["title", "description", "category", "author", "date"]) {
    if (!data[field]) errors.push(`${rel(file)}: missing "${field}"`);
  }
  if (data.category && !categorySlugs.has(data.category)) errors.push(`${rel(file)}: unknown category "${data.category}"`);
  if (data.author && !authorSlugs.has(data.author)) errors.push(`${rel(file)}: unknown author "${data.author}"`);
  if (!data.image?.src || !data.image?.alt) {
    errors.push(`${rel(file)}: image.src and image.alt are required`);
  } else if (data.image.src.startsWith("/") && !fs.existsSync(path.join(root, "public", data.image.src))) {
    errors.push(`${rel(file)}: image not found at public${data.image.src}`);
  }
  if (data.description && (data.description.length < 70 || data.description.length > 170)) {
    warnings.push(`${rel(file)}: description is ${data.description.length} characters (aim for 70-170)`);
  }
  if (/^#\s/m.test(body.replace(/```[\s\S]*?```/g, ""))) {
    errors.push(`${rel(file)}: body contains an H1 ("# "). The title is the H1; start sections at "##".`);
  }
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    warnings.push(`${rel(file)}: no sources listed`);
  }
}

const slugs = new Set(articles.map((a) => a.slug));
const published = articles.filter((a) => a.data.status === "published");
const drafts = articles.filter((a) => a.data.status !== "published");

for (const a of articles) {
  for (const m of a.body.matchAll(/\]\((\/[^)\s#]*)/g)) {
    const href = m[1];
    const blog = href.match(/^\/blog\/([^/]+)$/);
    const cat = href.match(/^\/category\/([^/]+)$/);
    if (blog && !slugs.has(blog[1])) errors.push(`${rel(a.file)}: broken internal link ${href}`);
    if (blog && slugs.has(blog[1]) && a.data.status === "published") {
      const target = articles.find((x) => x.slug === blog[1]);
      if (target.data.status !== "published") warnings.push(`${rel(a.file)}: links to draft article ${href}`);
    }
    if (cat && !categorySlugs.has(cat[1])) errors.push(`${rel(a.file)}: broken category link ${href}`);
  }
}

const pendingFactCheck = published.filter((a) => a.data.review?.factCheck !== "verified");

// OWNER_TODO markers in content and configuration.
const todoFiles = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(full);
    else if (/\.(mdx|js|json)$/.test(entry.name) && !entry.name.startsWith("_")) {
      const text = fs.readFileSync(full, "utf8");
      const count = (text.match(/OWNER_TODO|<OwnerTodo>/g) || []).length;
      if (count) todoFiles.push(`${rel(full)} (${count})`);
    }
  }
}
scan(path.join(root, "content"));
const siteConfigText = fs.readFileSync(path.join(root, "lib", "site.js"), "utf8");
const siteTodos = (siteConfigText.match(/"\[OWNER_TODO[^"]*"/g) || []).length;
if (siteTodos) todoFiles.push(`lib/site.js (${siteTodos} values)`);

// Production settings.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
if (!/^https:\/\//.test(siteUrl) || /localhost|vercel\.app/.test(siteUrl)) {
  launchIssues.push("NEXT_PUBLIC_SITE_URL should be your final https:// custom domain (not localhost or *.vercel.app).");
}
if (!process.env.NEXT_PUBLIC_CONTACT_EMAIL) launchIssues.push("NEXT_PUBLIC_CONTACT_EMAIL is not set.");
if (!(process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.CONTACT_FROM_EMAIL)) {
  warnings.push("Contact form delivery is not configured; the form is hidden in production and the email address is shown instead.");
}
const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";
if (adClient && !/^ca-pub-\d{10,20}$/.test(adClient)) {
  errors.push(`NEXT_PUBLIC_ADSENSE_CLIENT "${adClient}" is not in the form ca-pub-XXXXXXXXXXXXXXXX.`);
}

// Report.
const line = (s = "") => console.log(s);
line(`Articles: ${articles.length} (${published.length} published, ${drafts.length} draft)`);
if (drafts.length) line(`Drafts (never shown in production): ${drafts.map((a) => a.slug).join(", ")}`);

if (pendingFactCheck.length) {
  line(`\nPublished articles awaiting human fact-check (${pendingFactCheck.length}):`);
  for (const a of pendingFactCheck) {
    line(`  - ${a.slug}`);
    for (const note of a.data.review?.notes || []) line(`      • ${note}`);
  }
}
if (todoFiles.length) {
  line(`\nOWNER_TODO markers to complete:`);
  for (const f of todoFiles) line(`  - ${f}`);
}
if (warnings.length) {
  line(`\nWarnings:`);
  for (const w of warnings) line(`  - ${w}`);
}
if (launchMode && launchIssues.length) {
  line(`\nLaunch settings:`);
  for (const i of launchIssues) line(`  - ${i}`);
}
if (errors.length) {
  line(`\nErrors:`);
  for (const e of errors) line(`  - ${e}`);
}

const launchBlocked = launchMode && (pendingFactCheck.length || todoFiles.length || launchIssues.length);
if (errors.length || launchBlocked) {
  line(`\n✗ ${errors.length ? "Content errors found." : "Not ready to launch yet."}`);
  process.exit(1);
}
line(`\n✓ ${launchMode ? "Launch checks passed." : "Content checks passed."}`);
