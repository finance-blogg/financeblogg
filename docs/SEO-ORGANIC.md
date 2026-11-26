# Organic SEO playbook (FinanceBlogg)

Technical SEO is implemented in the codebase. Organic traffic still depends on indexing, content quality and trust (YMYL).

## Owner actions after deploy (required)

1. Set `NEXT_PUBLIC_SITE_URL` to the final `https://` custom domain and redeploy.
2. Pass `npm run check:launch` (fact-check published articles; clear OWNER_TODO markers).
3. Add the property in [Google Search Console](https://search.google.com/search-console), verify, submit `https://your-domain/sitemap.xml`.
4. URL Inspection → request indexing for `/` and 5–10 cornerstone articles.
5. Confirm `/robots.txt`, `/sitemap.xml`, `/rss.xml` and `/llms.txt` load on the live domain.
6. Run one article URL through [Rich Results Test](https://search.google.com/test/rich-results) (Article + FAQ).

## What the site already does

- Canonical URLs, meta titles/descriptions, OG/Twitter cards, per-article OG images
- `Article`, `FAQPage`, listing `CollectionPage`/`ItemList`, breadcrumbs, Organization, WebSite(+SearchAction)
- Sitemap, robots (blocks `/admin` and preview deployments), RSS, `/llms.txt`
- Internal links, related articles, noindex for search/empty categories

## Content cadence (highest leverage)

Publish 2–4 original, fact-checked explainers per month aimed at India search intent, for example:

- how / what-is / vs queries (budget, tax regime, SIP, EMI, credit score, UPI, health insurance terms)
- update articles when RBI/SEBI/IRDAI/Income Tax rules change (`updated:` date + short changelog in the body)

Each article should keep:

- one clear H1 (the title)
- 70–160 character `description` (or `seo.description`)
- `seo.title` under ~60 characters when the display title is long
- 3–5 `faq` Q&As that match visible answers on the page
- official sources + internal links to related explainers

## Backlinks (legitimate only)

Do not buy links or use PBNs. Prefer:

- guest explainers on education/finance sites with accurate author bio
- college/NGO workshop pages that cite your guides
- resource-page outreach for cornerstone guides

## Measurement

In Search Console, review weekly:

- Queries → impressions / CTR / position (rewrite weak titles)
- Pages → indexing errors
- Enhancements → Article / FAQ / Breadcrumbs

Traffic usually builds over weeks to months for a new domain; consistency beats one-off “SEO tricks”.
