#!/usr/bin/env node
/**
 * Compares public pages between two running servers (for example the
 * previous release and this branch) to confirm nothing visible changed:
 * visible text, title, meta description, canonical, robots, Open Graph and
 * JSON-LD. Build hashes and script tags are ignored.
 *
 *   node tests/smoke/compare-public.mjs http://localhost:3200 http://localhost:3100
 */
const [before, after] = process.argv.slice(2).map((u) => u.replace(/\/$/, ""));
if (!before || !after) {
  console.error("Usage: compare-public.mjs <baseline-url> <candidate-url>");
  process.exit(2);
}

const PAGES = [
  "/",
  "/blog",
  "/blog/how-to-read-a-bank-statement",
  "/blog/basics-of-income-tax-in-india",
  "/blog/understanding-sip-and-mutual-fund-investing",
  "/category/banking",
  "/category/financial-news-and-updates",
  "/authors/editorial-team",
  "/about",
  "/privacy-policy",
  "/contact",
  "/search?q=inflation",
  "/does-not-exist",
];

function normalise(html, origin) {
  const pick = (re) => [...html.matchAll(re)].map((m) => m[1].replaceAll(origin, "ORIGIN")).sort();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<template[\s\S]*?<\/template>/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    title: pick(/<title>([^<]*)<\/title>/g),
    meta: pick(/<meta (?:name|property)="((?:description|robots|og:[a-z:_]+|twitter:[a-z:_]+|google-adsense-account)"[^>]*?)\/?>/g).map((m) =>
      m.replace(/\?[a-f0-9]{8,}/g, "")
    ),
    canonical: pick(/<link rel="canonical" href="([^"]+)"/g),
    jsonLd: pick(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    adSlots: (html.match(/aria-label="Advertisement"/g) || []).length,
    text,
  };
}

function firstDifference(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i += 1;
  return `…${a.slice(Math.max(0, i - 80), i + 80)}…\n   vs\n…${b.slice(Math.max(0, i - 80), i + 80)}…`;
}

let differences = 0;
for (const path of PAGES) {
  const [ra, rb] = await Promise.all([fetch(before + path), fetch(after + path)]);
  const [a, b] = [normalise(await ra.text(), before), normalise(await rb.text(), after)];
  const problems = [];
  if (ra.status !== rb.status) problems.push(`status ${ra.status} → ${rb.status}`);
  for (const key of ["title", "meta", "canonical", "jsonLd", "adSlots"]) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) problems.push(`${key}:\n   before ${JSON.stringify(a[key])}\n   after  ${JSON.stringify(b[key])}`);
  }
  if (a.text !== b.text) problems.push(`visible text:\n   ${firstDifference(a.text, b.text)}`);
  console.log(`${problems.length ? "✗" : "✓"} ${path}${problems.length ? `\n  ${problems.join("\n  ")}` : ""}`);
  differences += problems.length;
}
console.log(differences ? `\n${differences} difference(s).` : "\nNo visible differences.");
process.exit(differences ? 1 : 0);
