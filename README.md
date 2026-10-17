# Rupee Ledger: Finance Education Blog

An article-only personal finance publication for readers in India, built with Next.js (App Router), JavaScript and Tailwind CSS. Content lives in local MDX files, so there is no database to run.

> **Current status:** the site builds and runs locally. It has **not** been deployed, submitted to Google Search Console, indexed, or reviewed or approved by Google AdSense. Starter articles are marked as **pending fact-check**, and legal and policy pages contain **OWNER_TODO** markers that must be completed before launch. See the [launch checklist](#launch-checklist).

---

## Contents

1. [What's included](#whats-included)
2. [Local development](#local-development)
3. [Project structure](#project-structure)
4. [Adding and editing articles](#adding-and-editing-articles)
5. [Editing policy pages and site details](#editing-policy-pages-and-site-details)
6. [Environment variables](#environment-variables)
7. [Deploying on Vercel](#deploying-on-vercel)
8. [Setting up a custom domain](#setting-up-a-custom-domain)
9. [Google Search Console](#google-search-console)
10. [Google AdSense integration](#google-adsense-integration)
11. [Contact form](#contact-form)
12. [SEO features](#seo-features)
13. [Quality scripts](#quality-scripts)
14. [Launch checklist](#launch-checklist)
15. [Known limitations](#known-limitations)

---

## What's included

**Pages:** homepage, all-articles listing, article pages, nine category pages, search results, author profiles, About, Contact, Privacy Policy, Disclaimer, Terms and Conditions, Editorial Policy, Corrections Policy and a custom 404.

**Articles:** 11 original starter explainers across the categories. Each one has worked examples labelled as illustrative, a limitations section, and links to official sources (RBI, DICGC, SEBI, AMFI, IRDAI, Income Tax Department, CBIC/GSTN, MoSPI and the credit bureaus). Every article is marked `factCheck: pending` with notes listing exactly what to verify.

**Not included, by design:** no calculators, financial tools, dashboards, trading simulators, fake view counts, fake reviews or invented popularity data. No placeholder ads are shown while AdSense is not configured. The "Most read" section stays hidden until you add real data.

**Tech:** Next.js 16 (App Router, Cache Components, Turbopack), React 19, Tailwind CSS 4 with the Typography plugin, `next-mdx-remote` for MDX, `yaml` for frontmatter.

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
app/                     Routes (App Router)
  blog/[slug]/           Article template and per-article Open Graph image
  category/[slug]/       Category pages
  authors/[slug]/        Author profiles
  search/                Search results (noindex)
  contact/               Contact page and server action
  about/, privacy-policy/, disclaimer/, terms/, editorial-policy/, corrections-policy/
  ads.txt/, rss.xml/, logo.png/   Generated files
  sitemap.js, robots.js, opengraph-image.js, icon.js, not-found.js, error.js
components/              UI components (layout, article, ads, mdx, forms, search, seo)
content/
  articles/*.mdx         Articles (frontmatter + MDX body); _template.mdx is a starting point
  authors/*.json         Author profiles; _template.json is a starting point
  pages/*.mdx            Editable policy and About page text
  popular.json           "Most read" list, filled from real analytics only
lib/
  site.js                Site name, owner details, contact and URL settings
  categories.js          The nine categories
  ads.js                 AdSense configuration (reads environment variables)
  content.js             Loads and validates all content
public/images/articles/  Featured images
scripts/                 Content, launch and link checks
```

## Adding and editing articles

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

Copy `content/authors/_template.json` to `content/authors/<slug>.json`. List only real people and **only credentials they actually hold** (for example, a SEBI registration number). The starter profile is the "Rupee Ledger Editorial Team" with no claimed credentials.

### Popular articles

`content/popular.json` controls the "Most read" section. Fill `slugs` in order only from real data, such as Search Console's Performance report or your analytics tool, and note the `source` and `lastUpdated`. The section is hidden while the list is empty.

## Editing policy pages and site details

- **Site settings:** `lib/site.js` holds the site name, tagline, owner name, location and jurisdiction. Values containing `OWNER_TODO` are shown highlighted on the site until replaced.
- **Policy pages:** edit `content/pages/*.mdx`. They use `<SiteName />`, `<OwnerName />`, `<ContactEmail />` and similar tags that pull from `lib/site.js` and environment variables, plus `<OwnerTodo>` markers for details only you can provide (email provider, data retention, review process, use of AI tools and so on).
- The policy pages are **templates, not legal advice**. Have them reviewed by a qualified professional, make sure every statement matches how you actually run the site, then remove the notes.
- Update the `updated:` date in a page's frontmatter whenever you change it.
- The brand name "Rupee Ledger" is a placeholder. Check that any name you use does not infringe an existing trademark.

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

Malformed AdSense values are ignored rather than rendered, so a typo cannot produce broken ad code.

## Deploying on Vercel

1. Push the project to a Git repository (GitHub, GitLab or Bitbucket).
2. In [Vercel](https://vercel.com), choose **Add New → Project** and import the repository. The Next.js framework preset is detected automatically; the default build command (`next build`) and output settings work as-is.
3. Under **Settings → Environment Variables**, add the variables above for the **Production** environment (at minimum `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTACT_EMAIL`).
4. Deploy. After adding or changing `NEXT_PUBLIC_*` variables, trigger a redeploy.

Preview deployments automatically serve a `robots.txt` that blocks crawling, so only production is indexed.

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

- **Search** is a simple keyword match over local content, which is right for a small site. For hundreds of articles, consider a dedicated search service.
- **Rate limiting** on the contact form is in memory per server instance. For stronger protection, add platform-level protection such as the Vercel Firewall, or a CAPTCHA such as Cloudflare Turnstile.
- **Content Security Policy** is not set, because AdSense loads scripts and frames from many Google domains. The other security headers are set in `next.config.mjs`.
- **`npm audit`** reports advisories in development tooling (ESLint's dependency chain and the Typography plugin's CSS selector parser). They affect build-time tools, not code served to visitors. Re-run `npm audit` and update packages periodically.
- **Content changes need a redeploy**, since articles are read from files at build time.
