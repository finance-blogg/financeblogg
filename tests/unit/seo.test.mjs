import test from "node:test";
import assert from "node:assert/strict";
import { articleJsonLd, faqPageJsonLd, itemListJsonLd } from "../../lib/seo.js";

test("faqPageJsonLd returns null for empty input", () => {
  assert.equal(faqPageJsonLd([]), null);
  assert.equal(faqPageJsonLd(null), null);
});

test("faqPageJsonLd builds FAQPage entities", () => {
  const data = faqPageJsonLd([
    { question: "What is EMI?", answer: "An equated monthly instalment." },
    { question: "Skip", answer: "" },
  ]);
  assert.equal(data["@type"], "FAQPage");
  assert.equal(data.mainEntity.length, 1);
  assert.equal(data.mainEntity[0].name, "What is EMI?");
  assert.equal(data.mainEntity[0].acceptedAnswer.text, "An equated monthly instalment.");
});

test("itemListJsonLd builds CollectionPage with ItemList", () => {
  const data = itemListJsonLd({
    name: "All articles",
    description: "Explainers",
    listPath: "/blog",
    items: [{ name: "Budget guide", url: "/blog/budget" }],
  });
  assert.equal(data["@type"], "CollectionPage");
  assert.equal(data.mainEntity["@type"], "ItemList");
  assert.equal(data.mainEntity.itemListElement[0].position, 1);
  assert.match(data.mainEntity.itemListElement[0].url, /\/blog\/budget$/);
});

test("articleJsonLd includes wordCount when provided", () => {
  const data = articleJsonLd(
    {
      slug: "sample",
      title: "Sample",
      description: "Desc",
      tags: ["tax"],
      wordCount: 900,
      readingMinutes: 5,
      date: "2026-01-01",
    },
    { name: "Team", slug: "editorial-team", isOrganization: true },
    { name: "Tax" }
  );
  assert.equal(data.wordCount, 900);
  assert.equal(data.timeRequired, "PT5M");
  assert.equal(data.isPartOf["@type"], "WebSite");
});
