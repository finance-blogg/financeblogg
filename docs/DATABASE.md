# Database schema

The content dashboard stores articles in Supabase PostgreSQL. Everything is created by the two migrations in `supabase/migrations/`:

| File | Purpose |
| --- | --- |
| `20261018000000_cms_schema.sql` | Tables, triggers, functions, grants, Row Level Security policies and the storage bucket. |
| `20261018000100_seed_reference_data.sql` | The nine existing categories and the "FinanceBlogg Editorial Team" author, with the same slugs as the MDX site. Safe to re-run. |

`npm run test:db` applies both files to an in-memory PostgreSQL (PGlite) with Supabase-style roles and checks the policies described below.

## Roles

| Role | Who | What it can do |
| --- | --- | --- |
| `anon` | Every public visitor (the publishable key, no session) | Read published, non-deleted articles whose publication time has passed (public columns only), all categories and authors, and call `mdx_import_slugs()`. Nothing else. |
| `authenticated` | Anyone signed in to Supabase Auth | Only what `public.is_admin()` allows. A signed-in user who is not in `admin_users` can read and change nothing. |
| `service_role` | The server-only secret key | Bypasses RLS. The app uses it only for `register_login_attempt`, `clear_login_attempts` and `publish_due_articles`, plus the import and backup scripts. |
| `postgres` | You, in the SQL editor | Owner. The only role that can add administrators. |

## Tables

### `admin_users`
The administrator allowlist. `user_id` references `auth.users`. Rows can only be inserted or changed from the SQL editor; there are no API write policies or grants. A signed-in user may read only their own row. Set `disabled_at` to revoke access without deleting the account.

`public.is_admin()` (security definer) returns true when the current `auth.uid()` has a row with `disabled_at is null`. Every admin policy uses it.

### `articles`
| Column | Notes |
| --- | --- |
| `id` | UUID primary key. |
| `slug` | Unique, lowercase-hyphenated, ≤ 120 characters. Locked by trigger once the article has been published (`first_published_at` set). |
| `title`, `subtitle`, `excerpt` | `excerpt` is the card summary and the default meta description. |
| `body` | Markdown with three directives (`:::key-takeaways`, `:::callout{type title}`, `::ad-break`). Rendered with raw HTML removed and a sanitising allowlist. |
| `featured_image_url`, `_alt`, `_width`, `_height`, `_credit` | URL must be a Supabase Storage public URL in the `article-images` bucket, or an `/images/...` file shipped with the site. |
| `category_slug`, `author_slug`, `reviewed_by` | Foreign keys to `categories` and `authors`. Categories and authors in use cannot be deleted. |
| `tags` | `text[]`, at most 20. |
| `seo_title`, `seo_description`, `canonical_url` | Optional overrides. Canonical must be `https://`. |
| `status` | `draft`, `scheduled` or `published`. |
| `published_at` | Publication time for published articles; the planned time for scheduled ones. The trigger fills it on first publication and rejects a "published" article dated in the future. |
| `first_published_at` | Set once, on first publication. Used to keep the original date on republishing and to lock the slug. |
| `updated_on` | Public "Updated" date, set by the editor after a substantive change. |
| `featured` | Homepage feature slot. |
| `sources` | JSON array of `{ title, publisher, url, note }`. |
| `fact_check_status`, `reviewed_on` | "Editorially reviewed" is shown publicly only when `verified`. |
| `review_notes`, `editorial_notes` | **Private.** Not granted to `anon`. |
| `reading_minutes`, `word_count` | Computed by the app on save. |
| `source_type` | `cms` or `mdx-import` (imported from `content/articles`). Immutable. |
| `search_vector` | Full-text index maintained by trigger. |
| `created_at`, `updated_at`, `created_by`, `updated_by` | Set by trigger; clients cannot forge them. |
| `deleted_at` | Soft delete ("trash"). Trashed articles are never public and can be restored as drafts. |

Triggers: `articles_before_write` (timestamps, authorship, slug lock, publication-time rules, search vector) and `articles_record_revision` (writes `article_revisions`).

### `article_revisions`
Written only by the trigger on every meaningful insert or update, with `action` = `created`, `updated`, `published`, `unpublished`, `scheduled`, `unscheduled`, `trashed` or `restored`, and a JSON `snapshot` of the row. Admins can read it; nobody can write it through the API. Deleted together with the article when it is deleted permanently.

### `categories`
`slug` (primary key, immutable in the UI), `name`, `short_name` (header navigation), `description`, `sort_order`.

### `authors`
`slug`, `name`, `role`, `bio`, `expertise[]`, `credentials[]` (only real, verifiable qualifications), `links` (JSON of https URLs), `image_url`, `is_organization`. Authors from `content/authors/*.json` keep working; a database author with the same slug replaces the file version.

### `media`
Library entries for files in the `article-images` bucket: `storage_path` (random `YYYY/MM/<uuid>.<ext>`), `public_url`, `alt_text`, `mime_type` (detected from the file bytes), `size_bytes` (≤ 4 MB enforced by the app and the bucket), `width`, `height`, `original_filename`. Admin-only.

### `article_previews`
Unsaved editor content stored for the private preview page. Admin-only, expire after two hours, and expired rows are deleted when a new preview is created.

### `auth_login_attempts`
SHA-256 hashes of `email:` and `ip:` keys with timestamps. No grants or policies; only `register_login_attempt` and `clear_login_attempts` (service role) touch it. Rows older than a day are deleted automatically.

## Functions

| Function | Executable by | Purpose |
| --- | --- | --- |
| `is_admin()` | `authenticated` | Allowlist check used by all policies. |
| `mdx_import_slugs()` | `anon`, `authenticated` | Slugs imported from MDX files, so the public site hides the file copies. These slugs were already public. |
| `register_login_attempt(key, max, window)` | `service_role` | Returns false once the key has `max` attempts in the window. |
| `clear_login_attempts(key)` | `service_role` | Resets the counter after a successful admin sign-in. |
| `publish_due_articles()` | `service_role` | Publishes scheduled articles whose time has passed; returns their slugs. |

## Storage

Bucket `article-images`: public read (so published images load without signed URLs), 4 MB limit, JPEG/PNG/WebP/GIF/AVIF only (no SVG). Listing, upload, update and delete require `is_admin()`. Files use unguessable random names, but anyone with a file's URL can open it, including images attached to drafts. Do not upload private material.

## Row Level Security summary

All tables have RLS enabled. Default Supabase grants are revoked first, then only the privileges listed above are granted, so an accidental `select *` from the public key fails instead of leaking private columns.

| Table | anon | non-admin user | admin |
| --- | --- | --- | --- |
| articles | read published (public columns) | nothing | all |
| article_revisions | nothing | nothing | read |
| categories, authors | read | read | all |
| media, article_previews | nothing | nothing | all (previews: own inserts only) |
| admin_users | nothing | own row | own row (read) |
| auth_login_attempts | nothing | nothing | nothing |
