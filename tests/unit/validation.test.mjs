import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, isValidSlug } from "../../lib/cms/slug.js";
import { validateArticleInput, targetStatus, isAllowedImageUrl } from "../../lib/cms/validation.js";

const options = {
  categories: ["banking", "tax-and-gst"],
  authors: ["editorial-team"],
  storagePrefix: "https://abc.supabase.co/storage/v1/object/public/article-images/",
  now: new Date("2026-10-18T06:00:00Z"),
};

const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

const complete = {
  title: "How fixed deposits work",
  slug: "how-fixed-deposits-work",
  excerpt: "A plain-language guide to fixed deposits in India, including interest, tenure and premature withdrawal.",
  body: `## Basics\n\n${words(200)}`,
  categorySlug: "banking",
  authorSlug: "editorial-team",
  factCheckConfirmed: true,
};

test("slugs are generated from titles", () => {
  assert.equal(slugify("Savings Account vs Fixed Deposit: Which Is Better?"), "savings-account-vs-fixed-deposit-which-is-better");
  assert.equal(slugify("  Tax & GST — Basics  "), "tax-and-gst-basics");
  assert.equal(slugify("Crème brûlée’s cost"), "creme-brulees-cost");
  assert.ok(slugify("word ".repeat(60)).length <= 100);
  assert.equal(isValidSlug("page"), false);
  assert.equal(isValidSlug("Bad Slug"), false);
  assert.equal(isValidSlug("double--dash"), false);
  assert.equal(isValidSlug("good-slug-2026"), true);
});

test("drafts need only a title and a valid slug", () => {
  const result = validateArticleInput({ title: "Draft", slug: "my-draft" }, { ...options, intent: "save" });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.data.status, "draft");

  const bad = validateArticleInput({ title: "", slug: "Not A Slug" }, { ...options, intent: "save" });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.title);
  assert.ok(bad.errors.slug);
});

test("publishing requires complete metadata and the fact-check confirmation", () => {
  const result = validateArticleInput({ title: "x", slug: "x" }, { ...options, intent: "publish" });
  assert.equal(result.ok, false);
  for (const field of ["excerpt", "categorySlug", "authorSlug", "body", "factCheckConfirmed"]) {
    assert.ok(result.errors[field], `expected an error for ${field}`);
  }
  const ok = validateArticleInput(complete, { ...options, intent: "publish" });
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  assert.equal(ok.data.status, "published");
  assert.equal(ok.data.wordCount > 150, true);
});

test("unknown categories, authors and unsafe image URLs are rejected", () => {
  const result = validateArticleInput(
    { ...complete, categorySlug: "crypto-tips", authorSlug: "someone", featuredImageUrl: "https://evil.example/x.png" },
    { ...options, intent: "publish" }
  );
  assert.ok(result.errors.categorySlug);
  assert.ok(result.errors.authorSlug);
  assert.ok(result.errors.featuredImageUrl);
  assert.equal(isAllowedImageUrl("/images/articles/a.svg", ""), true);
  assert.equal(isAllowedImageUrl("/images/../secrets.png", ""), false);
  assert.equal(isAllowedImageUrl(`${options.storagePrefix}2026/10/abc.webp`, options.storagePrefix), true);
  assert.equal(isAllowedImageUrl(`${options.storagePrefix}a b.png`, options.storagePrefix), false);
});

test("published images need alt text", () => {
  const result = validateArticleInput(
    { ...complete, featuredImageUrl: `${options.storagePrefix}x.png`, featuredImageAlt: "" },
    { ...options, intent: "publish" }
  );
  assert.ok(result.errors.featuredImageAlt);
});

test("scheduling needs a future time within a year", () => {
  const past = validateArticleInput({ ...complete, scheduledFor: "2026-10-17T00:00:00Z" }, { ...options, intent: "schedule" });
  assert.ok(past.errors.scheduledFor);
  const far = validateArticleInput({ ...complete, scheduledFor: "2028-01-01T00:00:00Z" }, { ...options, intent: "schedule" });
  assert.ok(far.errors.scheduledFor);
  const ok = validateArticleInput({ ...complete, scheduledFor: "2026-10-20T04:30:00Z" }, { ...options, intent: "schedule" });
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  assert.equal(ok.data.scheduledFor, "2026-10-20T04:30:00.000Z");
  assert.equal(ok.data.status, "scheduled");
});

test("dates cannot be in the future and canonical URLs must be https", () => {
  const result = validateArticleInput(
    { ...complete, updatedOn: "2026-12-01", reviewedOn: "2030-01-01", canonicalUrl: "http://example.com/x" },
    { ...options, intent: "save" }
  );
  assert.ok(result.errors.updatedOn);
  assert.ok(result.errors.reviewedOn);
  assert.ok(result.errors.canonicalUrl);
});

test("sources must use https and have titles", () => {
  const result = validateArticleInput(
    { ...complete, sources: [{ title: "RBI", url: "javascript:alert(1)" }, { title: "", url: "https://rbi.org.in" }, {}] },
    { ...options, intent: "save" }
  );
  assert.ok(result.errors["sources.0.url"]);
  assert.ok(result.errors["sources.1.title"]);
  assert.equal(result.data.sources.length, 2);
});

test("tags are trimmed and de-duplicated without changing their case", () => {
  const result = validateArticleInput({ ...complete, tags: "UPI, upi ,  fraud prevention,," }, { ...options, intent: "save" });
  assert.deepEqual(result.data.tags, ["UPI", "fraud prevention"]);
});

test("HTML in the body produces a warning", () => {
  const result = validateArticleInput({ ...complete, body: `${complete.body}\n\n<script>alert(1)</script>` }, { ...options, intent: "save" });
  assert.ok(result.warnings.some((w) => w.includes("HTML tags")));
});

test("intents map to statuses", () => {
  assert.equal(targetStatus("save", "published"), "published");
  assert.equal(targetStatus("save", undefined), "draft");
  assert.equal(targetStatus("unpublish", "published"), "draft");
  assert.equal(targetStatus("schedule", "draft"), "scheduled");
  assert.equal(validateArticleInput(complete, { ...options, intent: "delete-everything" }).ok, false);
});
