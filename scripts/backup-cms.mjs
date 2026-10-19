#!/usr/bin/env node
/**
 * Exports CMS content from Supabase to backups/cms-<timestamp>/ as JSON.
 *
 *   npm run cms:backup                   Articles, revisions, categories, authors, media metadata
 *   npm run cms:backup -- --with-images  Also downloads every file in the article-images bucket
 *
 * Uses SUPABASE_SECRET_KEY (server-only) from .env.local or the environment.
 * The output contains private drafts and notes: store it somewhere safe and
 * never commit it (backups/ is git-ignored).
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const withImages = process.argv.includes("--with-images");
const dir = path.join(root, "backups", `cms-${new Date().toISOString().replace(/[:.]/g, "-")}`);
fs.mkdirSync(dir, { recursive: true });

async function dump(table, columns = "*") {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  fs.writeFileSync(path.join(dir, `${table}.json`), JSON.stringify(rows, null, 2));
  console.log(`  ${table}: ${rows.length} row(s)`);
  return rows;
}

console.log(`Writing backup to ${path.relative(root, dir)}`);
await dump("categories");
await dump("authors");
await dump("articles", "id,slug,title,subtitle,excerpt,body,featured_image_url,featured_image_alt,featured_image_width,featured_image_height,featured_image_credit,category_slug,author_slug,tags,seo_title,seo_description,canonical_url,status,published_at,first_published_at,updated_on,featured,sources,fact_check_status,reviewed_by,reviewed_on,review_notes,editorial_notes,reading_minutes,word_count,source_type,created_at,updated_at,deleted_at");
await dump("article_revisions");
const media = await dump("media");

if (withImages) {
  const imagesDir = path.join(dir, "images");
  for (const item of media) {
    const { data, error } = await supabase.storage.from("article-images").download(item.storage_path);
    if (error) {
      console.error(`  could not download ${item.storage_path}: ${error.message}`);
      continue;
    }
    const target = path.join(imagesDir, item.storage_path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(await data.arrayBuffer()));
  }
  console.log(`  images: ${media.length} file(s)`);
}
console.log("Done.");
