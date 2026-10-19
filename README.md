# FinanceBlogg: Finance Education Blog

An article-only personal finance publication for readers in India, built with Next.js (App Router), JavaScript and Tailwind CSS. Articles come from two sources: the original MDX files in `content/articles`, and a private content dashboard at `/admin` backed by Supabase (PostgreSQL, Auth and Storage). The public site keeps working from the MDX files alone until Supabase is configured.

> **Current status:** the site builds and runs locally. It has **not** been deployed, submitted to Google Search Console, indexed, or reviewed or approved by Google AdSense. Starter articles are marked as **pending fact-check**, and legal and policy pages contain **OWNER_TODO** markers that must be completed before launch. See the [launch checklist](#launch-checklist).
>
> **Dashboard status:** the dashboard code, database migrations and policies are complete and tested locally (see [What has been verified](#what-has-been-verified)). It has **not** yet been connected to a real Supabase project or deployed; that requires the manual steps in [Dashboard deployment checklist](#dashboard-deployment-checklist). The existing MDX articles have **not** been migrated; they are backed up and the import is a separate step you approve and run.

---

## Contents

1. [What's included](#whats-included)
2. [Local development](#local-development)
3. [Project structure](#project-structure)
4. [Adding and editing articles](#adding-and-editing-articles)
5. [Content dashboard (/admin)](#content-dashboard-admin)
   - [How content flows](#how-content-flows)
   - [Supabase project setup](#supabase-project-setup)
   - [Database migrations](#database-migrations)
   - [Authentication setup](#authentication-setup)
   - [Administrator accounts](#administrator-accounts)
   - [Storage bucket](#storage-bucket)
   - [Writing and publishing in the dashboard](#writing-and-publishing-in-the-dashboard)
   - [Scheduled publishing](#scheduled-publishing)
   - [Migrating existing articles](#migrating-existing-articles)
   - [Backup and recovery](#backup-and-recovery)
   - [Security model and checks](#security-model-and-checks)
   - [Testing the dashboard locally](#testing-the-dashboard-locally)
   - [What has been verified](#what-has-been-verified)
   - [Dashboard deployment checklist](#dashboard-deployment-checklist)
6. [Editing policy pages and site details](#editing-policy-pages-and-site-details)
7. [Environment variables](#environment-variables)
8. [Deploying on Vercel](#deploying-on-vercel)
9. [Setting up a custom domain](#setting-up-a-custom-domain)
10. [Google Search Console](#google-search-console)
11. [Google AdSense integration](#google-adsense-integration)
12. [Contact form](#contact-form)
13. [SEO features](#seo-features)
14. [Quality scripts](#quality-scripts)
15. [Launch checklist](#launch-checklist)
16. [Known limitations](#known-limitations)

---

## What's included

**Pages:** homepage, all-articles listing, article pages, nine category pages, search results, author profiles, About, Contact, Privacy Policy, Disclaimer, Terms and Conditions, Editorial Policy, Corrections Policy and a custom 404.

**Articles:** 11 original starter explainers across the categories. Each one has worked examples labelled as illustrative, a limitations section, and links to official sources (RBI, DICGC, SEBI, AMFI, IRDAI, Income Tax Department, CBIC/GSTN, MoSPI and the credit bureaus). Every article is marked `factCheck: pending` with notes listing exactly what to verify.

**Not included, by design:** no calculators, financial tools, dashboards, trading simulators, fake view counts, fake reviews or invented popularity data. No placeholder ads are shown while AdSense is not configured. The "Most read" section stays hidden until you add real data.

**Content dashboard:** a private `/admin` area to write, preview, schedule, publish and unpublish articles, manage images, categories and authors, with revision history and a trash. See [Content dashboard](#content-dashboard-admin).

**Tech:** Next.js 16 (App Router, Cache Components, Turbopack, `proxy.js`), React 19, Tailwind CSS 4 with the Typography plugin, `next-mdx-remote` for MDX, `yaml` for frontmatter, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), `react-markdown` with `remark-gfm`, `remark-directive` and `rehype-sanitize` for database articles, and `@uiw/react-md-editor` as the Markdown editor.

## Local development

Requirements: Node.js 20.9 or newer (developed with Node 24) and npm.

```bash
npm install
cp .env.example .env.local    # PowerShell: Copy-Item .env.example .env.local
npm run dev                   # http://localhost:3000
```

Production build, to check before deploying:

```bash
npm run build
npm run start
```

In development (`npm run dev`):

- draft articles are visible, with a "Draft" badge;
- articles not yet fact-checked show an amber **"Fact-check required"** box listing what to verify;
- the contact page shows a notice if email delivery is not configured.

None of these appear in a production build.

## Project structure

```
app/
  layout.js              Document shell (fonts, base metadata). No header, footer or ads.
  (site)/                Public pages. The route group does not change URLs.
    layout.js            Public header, footer and AdSense script
    page.js              Homepage
    blog/, blog/[slug]/, blog/page/[page]/          Article list, articles, list pagination
    category/[slug]/, category/[slug]/page/[page]/  Category pages and pagination
    authors/[slug]/, search/, contact/, about/, privacy-policy/, ...
  admin/                 Private dashboard (noindex, no ads, login required)
    login/               Sign-in page
    (dashboard)/         Dashboard, articles, new, [id]/edit, media, categories, settings
    preview/[kind]/[id]/ Private previews (saved version or unsaved changes)
    actions/             Server Actions (auth, articles, media, categories and authors)
  api/cron/publish-scheduled/  Scheduled-publishing endpoint (CRON_SECRET)
  blog/[slug]/opengraph-image.js  Article share image (kept outside the group so its URL is unchanged)
  sitemap.js, robots.js, rss.xml/, ads.txt/, opengraph-image.js, icon.js, not-found.js
proxy.js                 Refreshes Supabase sessions and guards /admin (Next.js 16 "proxy", formerly middleware)
components/
  admin/                 Dashboard UI: editor, media library, managers
  article/ArticleView.js Article template shared by public pages and previews
  markdown/              Safe Markdown renderer for database articles
  layout, ads, mdx, forms, search, seo
content/                 MDX articles, authors and policy pages (unchanged)
lib/
  content.js             Public content layer: merges MDX and Supabase, cached and tagged
  mdx-source.js          Loads and validates the MDX files
  supabase/              Clients: public (anon), server (cookies), admin (secret key), proxy
  auth/                  Admin checks, session policy, safe redirects, login rate limiting
  cms/                   Validation, mapping, revalidation, image checks, MDX conversion
supabase/migrations/     Database schema, policies and seed data
docs/DATABASE.md         Schema and security reference
scripts/                 Content checks, MDX import, CMS backup
tests/                   Unit tests, database policy tests, HTTP smoke checks, local Supabase mock
.github/workflows/       Optional 15-minute scheduled-publishing trigger
```

## Adding and editing articles

Once the dashboard is set up, use [/admin](#writing-and-publishing-in-the-dashboard) for new articles. The MDX workflow below still works for the existing files.

1. Copy `content/articles/_template.mdx` to `content/articles/your-slug.mdx`.
2. Fill in the frontmatter (below), write the body in Markdown/MDX, and add a featured image to `public/images/articles/`.
3. Keep `status: draft` while writing. Run `npm run dev` to preview.
4. When the article has been fact-checked, set `review.factCheck: verified` and `status: published`.
5. Run `npm run check:content`, commit and deploy.

### Frontmatter fields

| Field | Required | Notes |
| --- | --- | --- |
| `title` | Yes | Becomes the page H1 and `<title>`. |
| `subtitle` | No | Shown under the title. |
| `slug` | No | URL `/blog/<slug>`. Defaults to the file name. Lowercase words and hyphens only. Do not change it after publishing. |
| `description` | Yes | Meta description, ideally 120 to 160 characters. Quote it if it contains a colon. |
| `category` | Yes | One of the slugs in `lib/categories.js`. |
| `author` | Yes | A file name in `content/authors/` without `.json`. |
| `date` | Yes | Original publication date, `YYYY-MM-DD`. |
| `updated` | No | Add only after a substantive update; shown as "Updated" and used as `dateModified`. |
| `status` | Yes | `draft` or `published`. Anything other than `published` is treated as a draft, and drafts are **never** included in production builds, the sitemap or the RSS feed. |
| `featured` | No | `true` puts the article in the homepage feature slot. |
| `image.src`, `image.alt` | Yes | Image path and descriptive alt text. `width` and `height` default to 1200 × 630. Optional `credit`. |
| `tags` | No | Used for related articles and tag search links. |
| `review.factCheck` | Yes | `pending` or `verified`. |
| `review.reviewedBy`, `review.reviewedOn` | No | Shows "Editorially reviewed by … on …" once verified. Only use for a real review. |
| `review.notes` | No | What must be checked. Shown in development and by `npm run check:content`. |
| `sources` | Recommended | A list of `title`, `publisher`, `url` (https only) and an optional `note`. Shown as "Sources and further reading". |

The build fails with a clear message if a required field is missing, a category or author does not exist, a slug is duplicated or a date is malformed.

### Writing guidelines

- The title is the only H1. Start sections at `##` and use `###` for sub-sections. Articles with three or more `##` sections get a table of contents automatically.
- Link to other articles with normal Markdown links such as `[budgeting](/blog/how-to-create-a-monthly-budget-in-india)`. `npm run check:content` flags broken internal links.
- Do not invent figures, rates, quotes or citations. If a figure changes each year, say which year it applies to and link to the official source.
- JavaScript expressions in MDX are disabled for safety. Use only the components below.

### MDX components

| Component | Use |
| --- | --- |
| `<KeyTakeaways>…</KeyTakeaways>` | Summary box near the top. |
| `<Callout type="example" title="…">…</Callout>` | Labelled boxes. Types: `example` (Illustrative example), `estimate`, `opinion` (Our view), `verify` (rule that changes), `warning`, `note`. |
| `<AdBreak />` | A manual in-article ad position. Renders nothing until AdSense and its slot are configured. Use at most one or two per article, between sections. |
| `<OwnerTodo>…</OwnerTodo>` | Highlights text the owner must complete. Visible everywhere so it cannot be missed. |

### Images

The starter articles use simple SVG illustrations created for this project. You can replace them with your own photos or licensed images (JPG or WebP, at least 1200 × 630). Raster images are automatically resized and served as AVIF or WebP by `next/image`. Always write alt text that describes the image.

### Authors

Copy `content/authors/_template.json` to `content/authors/<slug>.json`. List only real people and **only credentials they actually hold** (for example, a SEBI registration number). The starter profile is the "FinanceBlogg Editorial Team" with no claimed credentials.

### Popular articles

`content/popular.json` controls the "Most read" section. Fill `slugs` in order only from real data, such as Search Console's Performance report or your analytics tool, and note the `source` and `lastUpdated`. The section is hidden while the list is empty.

## Content dashboard (/admin)

A private dashboard for routine publishing without touching code: write and format articles, upload images, preview, save drafts, schedule, publish, unpublish, restore old versions and manage categories and authors. It is not linked from the public site and is marked `noindex`.

| Page | Purpose |
| --- | --- |
| `/admin/login` | Sign in. There is no public sign-up. |
| `/admin` | Overview: counts, recent edits, scheduled articles, overdue schedule warning. |
| `/admin/articles` | Search by title, filter by category and status (including trash), sort by last update, pagination; edit, preview, publish/unpublish and delete. |
| `/admin/articles/new`, `/admin/articles/<id>/edit` | The editor. |
| `/admin/media` | Upload, preview, set alt text, copy Markdown, replace and delete images. |
| `/admin/categories` | Add, rename, describe and reorder categories. |
| `/admin/settings` | Configuration status (never the secret values) and author profiles. |

### How content flows

- **Two sources, one layer.** `lib/content.js` merges the MDX files with published database articles. All public pages, the sitemap, RSS feed, search, category pages and related articles read through it, so URLs, design, SEO tags and ad placements are the same for both.
- **Only published content is public.** Public reads use the publishable (anon) key without a session, so Row Level Security returns only articles with status `published`, a publication time in the past and not in the trash. Drafts, scheduled articles and private notes cannot reach public pages, the sitemap, RSS, search or structured data.
- **Caching.** Public pages stay statically generated. Every read is cached with `use cache` and tagged; publishing, updating or unpublishing calls `updateTag` and `revalidatePath`, so the article page, homepage, `/blog`, category pages, author page, search, sitemap and RSS are re-rendered on their next request. Changes made directly in Supabase (not through the dashboard) appear within an hour. Article lists are built from a lightweight index (no article bodies) that is fetched only when invalidated, not on every request.
- **Slugs.** A database article and an MDX file cannot share a slug unless the article was imported from that file, in which case the database copy replaces the file on the public site. Slugs lock after first publication so links never break.
- **Rendering.** Database articles are Markdown. Raw HTML is ignored, output is sanitised (GitHub's allowlist) and `javascript:`/`data:` links are removed, so stored content cannot run scripts. The MDX files keep their existing renderer.
- **Ads.** The AdSense script and units load only through the public layout. Dashboard pages, the login page and previews load no AdSense code. In articles, `::ad-break` marks a manual ad position, like `<AdBreak />` in MDX.

### Supabase project setup

1. Create a project at [supabase.com](https://supabase.com). Choose the region closest to your readers (for India, Mumbai). Store the database password in a password manager.
2. Open **Project Settings → API Keys** and note the **Project URL**, the **publishable key** (`sb_publishable_…`) and the **secret key** (`sb_secret_…`). Older projects show legacy `anon` and `service_role` keys instead; those work too (see [Environment variables](#environment-variables)).
3. Recommended: in **Authentication → JWT Keys** (signing keys), switch to an asymmetric key. The app then verifies sessions locally instead of calling the Auth server on each dashboard request.

### Database migrations

Run both files in `supabase/migrations/` once, in order.

- **SQL editor (simplest):** open **SQL Editor → New query**, paste the contents of `20261018000000_cms_schema.sql`, run it, then do the same for `20261018000100_seed_reference_data.sql`.
- **Supabase CLI:** `npx supabase login`, `npx supabase link --project-ref <your-project-ref>`, then `npx supabase db push`.

Then check **Table Editor** (tables `articles`, `categories`, `authors`, `media`, …) and **Authentication → Policies** (RLS enabled on every table). [docs/DATABASE.md](docs/DATABASE.md) describes every table, policy and function. Future schema changes should be added as new, timestamped migration files rather than edits to these two.

### Authentication setup

In the Supabase dashboard:

1. **Authentication → Sign In / Providers:** keep **Email** enabled and turn **off** "Allow new users to sign up". Leave other providers disabled. (Even if sign-ups were left on, a new account cannot access anything without an `admin_users` row.)
2. **Authentication → URL Configuration:** set the Site URL to your production domain.
3. **Password security:** set a minimum length of at least 12 characters and enable leaked-password protection if your plan offers it.
4. **Sessions (paid plans):** optionally set "Time-box user sessions" and an inactivity timeout. Independently, the app signs administrators out a fixed time after sign-in (`ADMIN_SESSION_MAX_HOURS`, default 12).

How sign-in works: the login form posts to a Server Action, which checks the rate limit (5 attempts per email and 20 per IP address in 15 minutes, counted in Postgres when `SUPABASE_SECRET_KEY` is set), signs in with Supabase, and refuses and signs out any account that is not an active administrator. Session cookies are set by the server with `HttpOnly`, `SameSite=Lax` and, in production, `Secure`; the browser's JavaScript cannot read them. `proxy.js` refreshes the session on every `/admin` request. Post-login redirects only go to `/admin` paths, which prevents open redirects. Every page, Server Action and route re-checks the session and the allowlist on the server, and Row Level Security enforces the same rule in the database.

### Administrator accounts

There is no hard-coded administrator and no sign-up form. To add one:

1. **Authentication → Users → Add user → Create new user.** Enter the email and a strong, unique password and tick **Auto Confirm User**. Supabase stores only a password hash.
2. In the **SQL Editor**, add the account to the allowlist:

   ```sql
   insert into public.admin_users (user_id, email, display_name)
   select id, email, 'Your name'
   from auth.users
   where email = 'you@example.com';
   ```

3. Sign in at `https://your-domain/admin/login`.

To remove access, run `update public.admin_users set disabled_at = now() where email = 'you@example.com';` and, if needed, delete the user in **Authentication → Users**. Access is checked on every request, so it ends immediately. To change a password, use `npm run cms:set-password -- you@example.com` locally (it needs `SUPABASE_SECRET_KEY` in `.env.local` and asks for the new password).

### Storage bucket

The schema migration creates the `article-images` bucket: public read, 4 MB limit, JPEG/PNG/WebP/GIF/AVIF only, with upload, replace, list and delete restricted to administrators. Check it under **Storage**. If your project refused the bucket insert, create it manually with exactly those settings; the policies in the migration still apply.

Uploads go through a Server Action that checks the size and identifies the format from the file's bytes (not its name or the browser's claim), reads the dimensions, and stores it under a random name such as `2026/10/<uuid>.webp`. SVG is not accepted because it can contain scripts. Images are publicly reachable by URL once uploaded, including images attached to drafts, so never upload anything private. Note that Vercel limits request bodies to 4.5 MB.

### Writing and publishing in the dashboard

1. **New article.** Type the title; the URL slug is generated from it and can be edited until first publication.
2. **Write the body** in the Markdown editor. The toolbar covers headings (H2/H3), bold, italic, strikethrough, links, quotes, bulleted and numbered lists, tables and rules, plus three site components:
   - **Takeaways**: `:::key-takeaways` … `:::`
   - **Callout**: `:::callout{type="example" title="…"}` … `:::` (types: `note`, `example`, `opinion`, `estimate`, `warning`, `verify`)
   - **Ad break**: `::ad-break` (one or two per article at most)

   Use the Live or Preview view to see the formatting with the site's styles. Link to other articles with paths such as `/blog/how-to-read-a-bank-statement`.
3. **Fill in the sidebar:** featured image (choose from the library or upload) with alt text, category, author, tags, SEO title and description (they default to the title and excerpt), canonical URL only if the article was first published elsewhere, sources, the fact-check status and private notes.
4. **Save draft** keeps it private. Your work is also kept in the browser as you type; if you close the tab or your session expires, the editor offers to restore it. You are warned before leaving with unsaved changes, and `Ctrl+S` saves.
5. **Preview** opens the article in the public template (without ads) in a private, expiring link, including changes you have not saved yet.
6. **Publish** checks the required metadata (excerpt, category, author, at least 150 words, image alt text, meta description length) and asks you to confirm that figures, interest rates, tax rules and regulations have been checked against official sources. The publication date is set automatically and is kept if you later update or republish.
7. **Published articles:** "Update live article" saves changes straight to the live page. **Unpublish** removes it from the site, listings, search, sitemap and RSS immediately; the URL then returns 404.
8. **Delete** moves an article to the trash (and unpublishes it). Restore it as a draft from the trash, or delete it permanently there.
9. **History** in the editor lists every save, publish and unpublish. "Load" puts an older version into the editor; save to apply it.

If someone else (or another tab) saved the article after you opened it, saving stops with a conflict message instead of overwriting their changes.

### Scheduled publishing

Choose a date and time under **Schedule for** (in your device's time zone) and press **Schedule**. The article stays private until a scheduled job publishes it:

- **Vercel Cron** (`vercel.json`) calls `/api/cron/publish-scheduled` once a day at 00:30 UTC (06:00 IST). Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is set; requests without the correct secret are rejected. Cron jobs run on production deployments only.
- **Hobby plan limit:** Vercel Hobby allows only daily cron jobs, so a scheduled article can go live up to about 24 hours late. For closer timing:
  - on a Pro plan, change the schedule to `*/10 * * * *` (every 10 minutes);
  - or enable the included GitHub Actions workflow (`.github/workflows/publish-scheduled.yml`, every 15 minutes) by adding the repository secrets `SITE_URL` and `CRON_SECRET`. GitHub may delay scheduled runs, and the workflow does nothing until both secrets exist;
  - or point any external scheduler at the endpoint with the same header.
- **Manual fallback:** when a scheduled time has passed, the dashboard shows a warning with a **Publish due articles now** button.

The job needs `SUPABASE_SECRET_KEY` and `CRON_SECRET`. It publishes only articles that are scheduled, not in the trash and due, and running it twice is harmless.

### Migrating existing articles

The 11 existing articles live in `content/articles/*.mdx` (YAML frontmatter plus MDX with `<KeyTakeaways>`, `<Callout>` and `<AdBreak />`). They keep working exactly as before; nothing has been migrated. To move them into the dashboard when you are ready:

1. **Back up and review (no changes):** run `npm run cms:import`. It converts each file, checks it and writes the originals, the converted Markdown and an import plan to `backups/mdx-import-<timestamp>/` (git-ignored). All 11 current files convert cleanly. Review the converted files.
2. **Import (after you approve):** with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local`, run `npm run cms:import -- --apply`, or `-- --apply --only=slug-a,slug-b` to go one by one. Articles keep their slugs, dates, images, tags, sources and review status, and fact-check notes become private notes. Existing database slugs are skipped. The MDX files are not changed.
3. **Check:** redeploy (or wait up to an hour) and compare each article on the live site. Imported articles are now edited in the dashboard; the file copy is ignored while the database copy exists.
4. **Switch off the files** once satisfied: set `CMS_MDX_ARTICLES=off` in Vercel and redeploy. Keep the files in git as a backup.

To undo an import before step 4, delete the imported rows (`delete from public.articles where source_type = 'mdx-import';`) and the MDX versions are served again.

### Backup and recovery

- **Your own exports:** `npm run cms:backup` writes articles (including drafts and private notes), revisions, categories, authors and media records to `backups/cms-<timestamp>/` as JSON; add `-- --with-images` to download the image files as well. Run it regularly and store copies somewhere safe, not in git.
- **Full database dumps:** `npx supabase db dump -f backup.sql` (Supabase CLI, linked project) produces a SQL dump.
- **Supabase backups:** daily backups and point-in-time recovery depend on your Supabase plan; check **Database → Backups**.
- **Single article mistakes:** use the editor's **History** to load an earlier version, or restore from the **Trash**.
- **The MDX files** remain in git and can be served again at any time by removing the imported rows or setting `CMS_MDX_ARTICLES=on`.

### Security model and checks

- No admin links on public pages; `/admin` is `noindex`, disallowed in `robots.txt`, sent with `X-Robots-Tag: noindex`, `Cache-Control: no-store`, `X-Frame-Options: DENY` and a frame-ancestors CSP.
- Authorisation is checked on the server in every page, Server Action and route (`lib/auth/admin.js`) and again by Row Level Security in the database. Hiding buttons is never the protection.
- Server Actions have Next.js's built-in origin (CSRF) check. The cron route requires a secret compared in constant time.
- The secret key is used only in server modules marked `server-only` and never with a `NEXT_PUBLIC_` prefix.
- Input is validated on the server (`lib/cms/validation.js`) with the same rules the editor uses for instant feedback.

Run these checks against your real project after setup (replace the placeholders):

```bash
# Sign-ups are disabled: expect an error such as "Signups not allowed"
curl -X POST "$SUPABASE_URL/auth/v1/signup" -H "apikey: $PUBLISHABLE_KEY" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"long-test-password-123"}'

# The public key sees no drafts: expect []
curl "$SUPABASE_URL/rest/v1/articles?select=slug,status&status=neq.published" -H "apikey: $PUBLISHABLE_KEY"

# The public key cannot read private notes: expect a permission error
curl "$SUPABASE_URL/rest/v1/articles?select=editorial_notes" -H "apikey: $PUBLISHABLE_KEY"

# The public key cannot write: expect a 401/permission error
curl -X POST "$SUPABASE_URL/rest/v1/articles" -H "apikey: $PUBLISHABLE_KEY" -H "Content-Type: application/json" -d '{"slug":"x","title":"x"}'

# The cron endpoint rejects a missing or wrong secret: expect 401
curl -i "https://your-domain/api/cron/publish-scheduled"
```

Also: open `/admin` in a private window (it should send you to the login page), sign in with an account that is not on the allowlist (it should be refused), and in your browser's developer tools check that the `sb-…-auth-token` cookies are marked HttpOnly and Secure. After a deployment, search the built JavaScript for your secret key prefix (`sb_secret_`) to confirm it is absent.

### Testing the dashboard locally

| Command | What it does |
| --- | --- |
| `npm test` | All unit and database tests. |
| `npm run test:unit` | Validation, slugs, safe redirects, session rules, image detection, the Markdown sanitiser (XSS payloads) and MDX conversion of every existing article. |
| `npm run test:db` | Applies the migrations to an in-memory PostgreSQL (PGlite) with Supabase-style roles and checks every RLS policy, grant and function: public visibility, private columns, admin-only writes, no self-promotion to admin, slug locking, scheduling, rate limiting, storage and previews. This tests our SQL, not the hosted service. |
| `node tests/smoke/http-checks.mjs http://localhost:3000` | Against a running `next start`: public routes and status codes, canonical/OG/structured data, admin redirects and security headers, cron protection. |
| `node tests/smoke/compare-public.mjs <before-url> <after-url>` | Compares the visible text, metadata, JSON-LD and ad slots of public pages between two running versions. |
| `node tests/e2e/mock-supabase.mjs` | A small in-memory stand-in for the Supabase API, for clicking through the dashboard locally without a real project (see the file header for test accounts). It is not Supabase and does not enforce RLS. |

To develop against a real project, put the Supabase variables in `.env.local` and run `npm run dev`. Use a separate Supabase project for development or staging rather than your production database.

### What has been verified

Checked on this machine, before any real Supabase project or deployment existed:

- `npm run lint` and `npm run build` pass, both without Supabase variables (MDX-only) and with them.
- **Public site unchanged:** every public page was compared with the previous commit (visible text, title, meta description, canonical, robots, Open Graph, JSON-LD, ad slots): no differences. With test AdSense IDs, the script tag, meta tag, `ads.txt` and every ad unit are identical, and no AdSense code loads on `/admin` pages.
- **Database policies:** 17 PGlite tests against the real migration SQL pass.
- **Unit tests:** 24 tests pass, including XSS payloads and conversion of all 11 MDX articles.
- **No secrets in the browser:** a build made with test keys was searched; the secret key and cron secret appear in no client JavaScript (all Supabase calls run on the server).
- **Dashboard end to end, in a browser against the local mock API:** wrong-password and non-admin logins are refused; admin login works and returns to the requested page; auth cookies are invisible to JavaScript; tampered `next=//evil.example` goes to `/admin`; the sixth failed login is rate-limited; sign-out works and protected pages then redirect. Article creation with automatic slug, draft save, validation errors, publish blocked without the fact-check confirmation, preview of unsaved changes (noindex, no ads, no structured data, injected `<script>` and `javascript:` links not rendered), publish (article page, homepage, `/blog`, category, sitemap, RSS and search updated on the next request), unpublish (article 404 and removed everywhere on the next request), trash, restore, scheduling, cron publishing at the due time, revision history, image upload (fake image rejected by content, oversized file rejected, real image stored under a random name), category creation and deletion protection, and the layout at 390 px and 1440 px widths.

**Not yet verified**, because it needs your accounts: the real Supabase project (Auth, PostgREST, Storage and the policies on the hosted service), the Vercel deployment and its cron, the GitHub Actions trigger, password changes, and the MDX import against a real database. Run the [security checks](#security-model-and-checks) and the checklist below after setup.

### Dashboard deployment checklist

Manual steps are marked **(you)**.

1. **(you)** Create the Supabase project and copy the URL, publishable key and secret key.
2. **(you)** Run both migrations; confirm the tables, RLS policies and the `article-images` bucket exist.
3. **(you)** Disable sign-ups and set password rules in Authentication settings.
4. **(you)** Create your administrator user (auto-confirmed) and insert it into `admin_users`.
5. **(you)** In Vercel → Settings → Environment Variables, add for **Production**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `CRON_SECRET` (at least 32 random characters), and optionally `ADMIN_SESSION_MAX_HOURS`. Mark the secret ones as Sensitive.
6. **(you)** For **Preview**: either leave the Supabase variables out (previews then run on MDX only) or point them at a separate staging Supabase project. Do not give preview deployments your production secret key. Keep Vercel Deployment Protection on for previews.
7. Push to GitHub; Vercel builds and deploys. Redeploy after changing any `NEXT_PUBLIC_` variable.
8. **(you)** Sign in at `/admin/login`, create a test draft, preview it, publish it, check the live page, then unpublish and delete it.
9. **(you)** Run the [security checks](#security-model-and-checks).
10. **(you)** Check **Vercel → Settings → Cron Jobs** lists the job; schedule a test article and confirm it publishes (or use "Publish due articles now"). Optionally add the GitHub secrets for 15-minute runs.
11. **(you)** Run `npm run cms:backup` once to confirm backups work, and decide on a backup routine.
12. **(you)** When ready, migrate the MDX articles as described above.

## Editing policy pages and site details

- **Site settings:** `lib/site.js` holds the site name, tagline, owner name, location and jurisdiction. Values containing `OWNER_TODO` are shown highlighted on the site until replaced.
- **Policy pages:** edit `content/pages/*.mdx`. They use `<SiteName />`, `<OwnerName />`, `<ContactEmail />` and similar tags that pull from `lib/site.js` and environment variables, plus `<OwnerTodo>` markers for details only you can provide (email provider, data retention, review process, use of AI tools and so on).
- The policy pages are **templates, not legal advice**. Have them reviewed by a qualified professional, make sure every statement matches how you actually run the site, then remove the notes.
- Update the `updated:` date in a page's frontmatter whenever you change it.
- The brand name is "FinanceBlogg", set in `lib/site.js`. Check that it does not infringe an existing trademark.

## Environment variables

Copy `.env.example` to `.env.local` for local work, and add the same keys in Vercel for production. `NEXT_PUBLIC_*` values are embedded at build time, so **redeploy after changing them**.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Production domain, such as `https://www.example.in`. Used for canonical URLs, sitemap, RSS, Open Graph and structured data. If unset on Vercel, the Vercel production URL is used; locally it falls back to `http://localhost:3000`. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Public contact email shown on the site. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console HTML-tag verification code (the `content` value only). |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | AdSense publisher ID, `ca-pub-` followed by digits. Enables the AdSense script, the `google-adsense-account` meta tag and `/ads.txt`. |
| `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_INLINE` | Slot ID for `<AdBreak />` positions inside articles. |
| `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_END` | Slot ID after the article, before related articles. |
| `NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR` | Slot ID at the bottom of the desktop sidebar. |
| `NEXT_PUBLIC_ADSENSE_SLOT_HOME_FEED` | Slot ID between homepage sections. |
| `NEXT_PUBLIC_ADSENSE_SLOT_LISTING` | Slot ID within long article listings. |
| `NEXT_PUBLIC_NEWSLETTER_URL` | Link to a signup page run by your newsletter provider. The newsletter box is hidden while empty. |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | Server-only. Enables contact form delivery through [Resend](https://resend.com). |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Public by design. Without it (and the key below) the site runs on MDX only and `/admin` shows a setup notice. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_…`). Public by design; RLS limits it to published content. Legacy projects can use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead. |
| `SUPABASE_SECRET_KEY` | **Server-only.** Supabase secret key (`sb_secret_…`), or the legacy key in `SUPABASE_SERVICE_ROLE_KEY`. Used for login rate limiting, scheduled publishing and the import/backup/password scripts. Never prefix it with `NEXT_PUBLIC_`. |
| `CRON_SECRET` | **Server-only.** At least 16 (recommended 32+) random characters. Protects `/api/cron/publish-scheduled`; Vercel Cron sends it automatically. |
| `ADMIN_SESSION_MAX_HOURS` | Optional. Hours a dashboard sign-in lasts (1–168, default 12). |
| `CMS_MDX_ARTICLES` | Optional. Set to `off` after importing the MDX articles to stop serving the files. Default `on`. |

**Which environments need what (Vercel):**

| Variable | Production | Preview |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, AdSense, Search Console | Yes | Optional (previews are blocked from indexing anyway) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Only for a separate staging Supabase project, or leave unset |
| `SUPABASE_SECRET_KEY`, `CRON_SECRET` | Yes (mark Sensitive) | Only staging values; never the production secret key |
| `ADMIN_SESSION_MAX_HOURS`, `CMS_MDX_ARTICLES` | As needed | As needed |

Malformed AdSense values are ignored rather than rendered, so a typo cannot produce broken ad code.

## Deploying on Vercel

1. Push the project to a Git repository (GitHub, GitLab or Bitbucket).
2. In [Vercel](https://vercel.com), choose **Add New → Project** and import the repository. The Next.js framework preset is detected automatically; the default build command (`next build`) and output settings work as-is.
3. Under **Settings → Environment Variables**, add the variables above for the **Production** environment (at minimum `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTACT_EMAIL`, plus the Supabase and cron variables for the dashboard).
4. Deploy. After adding or changing `NEXT_PUBLIC_*` variables, trigger a redeploy.
5. For the dashboard, follow the [Dashboard deployment checklist](#dashboard-deployment-checklist). `vercel.json` registers the daily scheduled-publishing cron job; it runs on production deployments only.

Preview deployments automatically serve a `robots.txt` that blocks crawling, so only production is indexed.

With Supabase configured, the build reads the published article list from the database to prerender pages. If the database is unreachable during a build, the build fails rather than deploying a site with articles missing; the previous deployment stays live.

## Setting up a custom domain

1. Buy a domain from a registrar.
2. In Vercel, open **Project → Settings → Domains** and add both `example.in` and `www.example.in`. Choose one as the primary and set the other to redirect to it.
3. Add the DNS records Vercel shows you at your registrar. Use the exact values from the Vercel dashboard, as they can change.
4. Wait for DNS to propagate and for Vercel to issue the HTTPS certificate.
5. Set `NEXT_PUBLIC_SITE_URL` to the primary domain, including `https://`, and redeploy.

## Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console) and add a property.
   - **Domain property** (recommended): verify by adding the TXT record Google gives you to your DNS.
   - **URL-prefix property**: choose the **HTML tag** method, copy only the `content` value into `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, redeploy, then click **Verify**.
2. Under **Sitemaps**, submit `https://your-domain/sitemap.xml`.
3. Use **URL Inspection** on your homepage and a few articles, and request indexing.
4. Over the following weeks, check **Pages** (indexing) and **Enhancements** (breadcrumbs and article structured data) for issues.

Indexing is decided by Google and is not guaranteed or immediate.

## Google AdSense integration

### How it works in this project

- **Nothing loads until configured.** With `NEXT_PUBLIC_ADSENSE_CLIENT` empty, no AdSense script, meta tag, ad container or `ads.txt` record is produced.
- **Script:** when a valid publisher ID is set, the official `adsbygoogle.js` script is added once per page in `<head>` (`components/ads/AdSenseScript.js`), along with the `google-adsense-account` meta tag.
- **Auto ads:** the same script enables Auto ads if you switch them on in AdSense. No code change is needed.
- **Manual units:** `components/ads/AdSlot.js` renders a unit only when both the publisher ID and that placement's slot ID are set. Each unit sits in a clearly labelled "Advertisement" box with a dashed border, away from navigation, share buttons and article controls. Empty units that Google reports as unfilled are hidden.
- **ads.txt:** `/ads.txt` is generated from your publisher ID as `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`. It returns 404 until the ID is set.
- **Placements:** inside articles (wherever `<AdBreak />` appears, one per starter article), after the article body, at the bottom of the desktop sidebar, between homepage sections, and within long listings. Adjust in `lib/ads.js` and the page components.

### Steps

1. **Before applying:** deploy on your custom domain, complete every OWNER_TODO, fact-check and publish your articles, and make sure the About, Contact, Privacy Policy and other pages are accurate. AdSense reviews whether a site has original, useful content and a clear, working navigation.
2. **Sign up** at [adsense.google.com](https://adsense.google.com) and add your site.
3. **Connect your site.** AdSense offers several methods. This project supports them all through one variable: set `NEXT_PUBLIC_ADSENSE_CLIENT` to your real publisher ID (shown in AdSense under Account → Account information) and redeploy. That produces the **AdSense code snippet**, the **meta tag** and the **ads.txt snippet**. Then choose a method in AdSense and click **Verify**.
4. **Request review.** Google reviews the site, which can take from a few days to several weeks. Do not repeatedly change the site's structure during the review.
5. **Consent for EEA, UK and Switzerland visitors.** Google requires a Google-certified consent management platform for these regions. The simplest option is AdSense **Privacy & messaging → European regulations message**. Keep the privacy policy consistent with what you enable.
6. **After approval:**
   - Turn on **Auto ads** under Ads → By site, and/or
   - create display ad units under **Ads → By ad unit**, then copy each unit's `data-ad-slot` number into the matching `NEXT_PUBLIC_ADSENSE_SLOT_*` variable and redeploy.
7. **Check ads.txt** at `https://your-domain/ads.txt` and wait for AdSense to show it as authorised.

### Ad policy reminders

- Never click your own ads or ask anyone to click them, and do not use wording like "support us by clicking".
- Do not place ads where they could be mistaken for navigation, download buttons or article controls, and do not style them to look like content.
- Do not add more `<AdBreak />` positions than the content can support. Readers come first.
- This project never promises earnings. AdSense revenue depends on traffic, audience and Google's decisions.

## Contact form

The form (`/contact`) posts to a server action that:

- validates every field on the server (lengths, email format, topic list, consent);
- rejects submissions with a filled honeypot field or that are completed implausibly fast, which needs JavaScript;
- limits each IP to 5 messages per 10 minutes (per server instance, best effort);
- sends the message as plain text through the Resend API using server-only environment variables;
- stores nothing itself.

If `RESEND_API_KEY`, `CONTACT_TO_EMAIL` and `CONTACT_FROM_EMAIL` are not all set, the form is hidden in production and the public email address is shown instead. `CONTACT_FROM_EMAIL` must be an address on a domain you have verified in Resend. To use a different provider, change the `fetch` call in `app/contact/actions.js` and update the privacy policy.

## SEO features

- A unique `<title>` and meta description for every page, with canonical URLs built from `NEXT_PUBLIC_SITE_URL`.
- Open Graph and Twitter card tags, with a generated 1200 × 630 image for each article and for the site.
- `sitemap.xml` (published articles, non-empty categories, author and policy pages) and `robots.txt`.
- Structured data: `Article` (author, publish and modified dates), `BreadcrumbList`, `Organization`, `WebSite` and `ProfilePage`.
- RSS feed at `/rss.xml`.
- Clean URLs (`/blog/<slug>`, `/category/<slug>`), related articles and in-text links for internal linking.
- Search result pages and empty category pages are `noindex`. Unknown URLs return a real 404 status.
- One H1 per page, with a sequential heading structure.

## Quality scripts

| Command | What it does |
| --- | --- |
| `npm run check:content` | Validates articles: required fields, categories, authors, images, internal links, no H1 in the body, description length. Lists drafts and articles awaiting fact-check. |
| `npm run check:launch` | Everything above, and fails if any published article is still `pending`, any OWNER_TODO remains, or `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_CONTACT_EMAIL` are not production-ready. Reads `.env.local` and `.env.production.local` if present. |
| `npm run check:links` | Requests every source URL in the articles and reports failures. Some official sites block automated requests, so open failures in a browser before changing them. A link that loads still needs a human to confirm that it supports the claim. |
| `npm run lint` | ESLint (Next.js rules). |
| `npm test` | Unit and database-policy tests (see [Testing the dashboard locally](#testing-the-dashboard-locally)). |
| `npm run cms:import` | Dry run of the MDX-to-database import, with a backup; `-- --apply` imports. |
| `npm run cms:backup` | Exports CMS content from Supabase to `backups/`. |
| `npm run cms:set-password -- email` | Sets a new password for a dashboard user. |

## Launch checklist

**Content**

- [ ] A qualified human has fact-checked every published article against current official sources, using each article's `review.notes`. Pay special attention to the income tax article, which uses FY 2025-26 figures as illustrations, and to any section references affected by the Income-tax Act, 2025.
- [ ] Set `review.factCheck: verified` (and `reviewedBy` / `reviewedOn` only if a named person really reviewed it).
- [ ] Set each article's `date` to its actual publication date.
- [ ] Add more original articles over time, especially for Financial News and Updates, which is empty and kept out of the index until it has content.
- [ ] Replace or keep the cover illustrations, and confirm alt text.

**Owner details and policies**

- [ ] Replace every OWNER_TODO in `lib/site.js` and `content/pages/*.mdx`.
- [ ] Have the Privacy Policy, Terms and Disclaimer reviewed by a legal professional.
- [ ] Describe your real editorial process and use of AI tools in the Editorial Policy.
- [ ] Add real author profiles if individuals write or review articles.
- [ ] Confirm the brand name is free to use.

**Configuration**

- [ ] `NEXT_PUBLIC_SITE_URL` is set to the final https custom domain.
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` is set, and the contact form delivery is configured and tested (or deliberately left off).
- [ ] `npm run check:launch` passes.
- [ ] `npm run build` succeeds locally and on Vercel.

**After deployment**

- [ ] Visit the homepage, an article, a category, search, contact and a 404 page on the live domain, on mobile and desktop.
- [ ] Check `/sitemap.xml`, `/robots.txt` and `/rss.xml` on the live domain.
- [ ] Verify the site in Google Search Console and submit the sitemap.
- [ ] Test an article URL in Google's [Rich Results Test](https://search.google.com/test/rich-results).
- [ ] Apply for AdSense only after the above, then configure consent messaging, ads.txt and ad units as described.

## Known limitations

- **Search** is a simple keyword match over the MDX files plus PostgreSQL full-text search for database articles, which is right for a small site. For hundreds of articles, consider a dedicated search service.
- **Rate limiting** on the contact form is in memory per server instance. For stronger protection, add platform-level protection such as the Vercel Firewall, or a CAPTCHA such as Cloudflare Turnstile.
- **Content Security Policy** is not set, because AdSense loads scripts and frames from many Google domains. The other security headers are set in `next.config.mjs`.
- **`npm audit`** reports advisories in development tooling (ESLint's dependency chain and the Typography plugin's CSS selector parser). They affect build-time tools, not code served to visitors. Re-run `npm audit` and update packages periodically.
- **MDX file changes need a redeploy**, since those files are read at build time. Articles published from the dashboard do not.
- **Dashboard sign-in is email and password only.** Multi-factor authentication is not built in; use a long unique password, and consider adding Supabase MFA if more people get access.
- **Scheduled publishing precision** depends on how often the job runs: daily on Vercel Hobby, or every 10–15 minutes with a Pro cron or the GitHub workflow.
- **One editor role.** Every administrator can do everything; there are no separate author/editor permissions.
- **Uploaded images are public by URL** (random file names, no listing), including images attached to drafts.
- **Login rate limiting** counts attempts in Postgres when `SUPABASE_SECRET_KEY` is set; without it, it falls back to per-instance memory. Supabase Auth's own rate limits apply in addition.
- **Footer email at some widths:** the long contact address in the footer can overflow its column by a few pixels at widths around 850 px. This existed before the dashboard work and was left unchanged.
