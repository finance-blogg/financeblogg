#!/usr/bin/env node
/**
 * Imports content/articles/*.mdx into the Supabase `articles` table.
 *
 *   npm run cms:import                 Dry run (default): converts, validates and writes
 *                                      a backup + review copy to backups/. Changes nothing.
 *   npm run cms:import -- --apply      Inserts the articles into the database.
 *   npm run cms:import -- --apply --only=slug-a,slug-b
 *
 * Never deletes or edits the MDX files. Articles whose slug already exists in
 * the database are skipped. Requires NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SECRET_KEY (server-only) in .env.local or the environment.
 * See README > "Migrating existing articles" before running with --apply.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { createClient } from "@supabase/supabase-js";
import { mdxToMarkdown } from "../lib/cms/mdx-to-markdown.js";
import { textStats } from "../lib/cms/headings.js";

const root = process.cwd();
for (const file of [".env", ".env.local"]) {
  if (fs.existsSync(path.join(root, file))) {
    try {
      process.loadEnvFile(path.join(root, file));
    } catch {
      // Ignore malformed env files here.
    }
  }
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const only = new Set((args.find((a) => a.startsWith("--only=")) || "").replace("--only=", "").split(",").filter(Boolean));

const articlesDir = path.join(root, "content", "articles");
const authorsDir = path.join(root, "content", "authors");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(root, "backups", `mdx-import-${stamp}`);

function parse(file) {
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${path.basename(file)}: missing frontmatter`);
  return { raw, data: YAML.parse(match[1]) || {}, body: match[2] };
}

function isoFromDate(value) {
  return value ? `${String(value)}T00:00:00+05:30` : null;
}

const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith(".mdx") && !f.startsWith("_"));
const plan = [];
for (const name of files) {
  const file = path.join(articlesDir, name);
  const { raw, data, body } = parse(file);
  const slug = data.slug || name.replace(/\.mdx$/, "");
  if (only.size && !only.has(slug)) continue;

  const { markdown, problems } = mdxToMarkdown(body);
  const status = data.status === "published" ? "published" : "draft";
  const stats = textStats(markdown);
  const review = data.review || {};
  const image = data.image || {};
  const row = {
    slug,
    title: String(data.title || ""),
    subtitle: String(data.subtitle || ""),
    excerpt: String(data.description || ""),
    body: markdown,
    featured_image_url: image.src || null,
    featured_image_alt: String(image.alt || ""),
    featured_image_width: Number(image.width) || 1200,
    featured_image_height: Number(image.height) || 630,
    featured_image_credit: String(image.credit || ""),
    category_slug: data.category || null,
    author_slug: data.author || null,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    status,
    published_at: status === "published" ? isoFromDate(data.date) : null,
    first_published_at: status === "published" ? isoFromDate(data.date) : null,
    updated_on: data.updated ? String(data.updated) : null,
    featured: Boolean(data.featured),
    sources: Array.isArray(data.sources) ? data.sources : [],
    fact_check_status: review.factCheck === "verified" ? "verified" : "pending",
    reviewed_by: review.reviewedBy || null,
    reviewed_on: review.reviewedOn ? String(review.reviewedOn) : null,
    review_notes: Array.isArray(review.notes) ? review.notes.map((n) => `- ${n}`).join("\n") : "",
    reading_minutes: stats.readingMinutes,
    word_count: stats.wordCount,
    source_type: "mdx-import",
  };
  if (!row.title) problems.push("missing title");
  if (status === "published" && !data.date) problems.push("published without a date");
  plan.push({ name, slug, raw, row, problems });
}

// Backup of the original files plus the converted Markdown, for review.
fs.mkdirSync(path.join(backupDir, "original"), { recursive: true });
fs.mkdirSync(path.join(backupDir, "converted"), { recursive: true });
for (const p of plan) {
  fs.writeFileSync(path.join(backupDir, "original", p.name), p.raw);
  fs.writeFileSync(path.join(backupDir, "converted", `${p.slug}.md`), p.row.body);
}
fs.writeFileSync(path.join(backupDir, "plan.json"), JSON.stringify(plan.map(({ raw, ...rest }) => rest), null, 2));

console.log(`MDX articles found: ${plan.length}`);
for (const p of plan) {
  console.log(`  ${p.problems.length ? "✗" : "✓"} ${p.slug} (${p.row.status}, ${p.row.word_count} words)${p.problems.length ? `\n      ${p.problems.join("\n      ")}` : ""}`);
}
console.log(`\nBackup and converted copies written to ${path.relative(root, backupDir)}`);

const blocked = plan.filter((p) => p.problems.length);
if (!apply) {
  console.log("\nDry run only. Nothing was written to the database.");
  console.log("Review the converted files, then run: npm run cms:import -- --apply");
  process.exit(blocked.length ? 1 : 0);
}
if (blocked.length) {
  console.error(`\n${blocked.length} article(s) have problems. Fix them or exclude them with --only=... before applying.`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("\nNEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set to import.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// Authors referenced by the articles must exist in the database.
const neededAuthors = new Set(plan.flatMap((p) => [p.row.author_slug, p.row.reviewed_by]).filter(Boolean));
for (const slug of neededAuthors) {
  const file = path.join(authorsDir, `${slug}.json`);
  if (!fs.existsSync(file)) continue;
  const a = JSON.parse(fs.readFileSync(file, "utf8"));
  const { error } = await supabase.from("authors").upsert(
    {
      slug,
      name: a.name,
      role: a.role || "",
      bio: a.bio || "",
      expertise: a.expertise || [],
      credentials: a.credentials || [],
      links: a.links || {},
      image_url: a.image || null,
      is_organization: Boolean(a.isOrganization),
    },
    { onConflict: "slug", ignoreDuplicates: true }
  );
  if (error) {
    console.error(`Could not ensure author ${slug}: ${error.message}`);
    process.exit(1);
  }
}

const { data: existing, error: existingError } = await supabase.from("articles").select("slug").in("slug", plan.map((p) => p.slug));
if (existingError) {
  console.error(`Could not read existing articles: ${existingError.message}`);
  process.exit(1);
}
const taken = new Set(existing.map((r) => r.slug));

let imported = 0;
for (const p of plan) {
  if (taken.has(p.slug)) {
    console.log(`  – ${p.slug}: already in the database, skipped`);
    continue;
  }
  const { error } = await supabase.from("articles").insert(p.row);
  if (error) {
    console.error(`  ✗ ${p.slug}: ${error.message}`);
    continue;
  }
  imported += 1;
  console.log(`  ✓ ${p.slug}: imported`);
}

console.log(`\nImported ${imported} article(s). The MDX files were not changed.`);
console.log("Next: redeploy (or wait up to an hour) so the public site picks up the database copies,");
console.log("check each article on the live site, then set CMS_MDX_ARTICLES=off when you are satisfied.");
