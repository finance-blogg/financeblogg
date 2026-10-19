import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import { mdxToMarkdown } from "../../lib/cms/mdx-to-markdown.js";
import { rehypePlugins, remarkPlugins } from "../../components/markdown/pipeline.js";

const articlesDir = path.resolve(import.meta.dirname, "../../content/articles");

test("components are converted to directives", () => {
  const { markdown, problems } = mdxToMarkdown(
    [
      "<KeyTakeaways>",
      "- one",
      "</KeyTakeaways>",
      "",
      '<Callout type="example" title="₹1 lakh of today\'s expenses">',
      "Body",
      "</Callout>",
      "",
      "<AdBreak />",
      "",
      "Text <OwnerTodo>fill this in</OwnerTodo>.",
    ].join("\n")
  );
  assert.deepEqual(problems, []);
  assert.match(markdown, /^:::key-takeaways$/m);
  assert.match(markdown, /^:::callout\{type="example" title="₹1 lakh of today's expenses"\}$/m);
  assert.match(markdown, /^::ad-break$/m);
  assert.match(markdown, /\*\*\[OWNER_TODO: fill this in\]\*\*/);
});

test("unknown components and nesting are reported, not dropped", () => {
  assert.ok(mdxToMarkdown("<Chart data={x} />").problems.length > 0);
  assert.ok(mdxToMarkdown('import X from "y"\n\ntext').problems.length > 0);
  assert.ok(mdxToMarkdown('<Callout type="scam">\nx\n</Callout>').problems.length > 0);
  assert.ok(mdxToMarkdown("<KeyTakeaways>\n<Callout>\nx\n</Callout>\n</KeyTakeaways>").problems.length > 0);
  assert.deepEqual(mdxToMarkdown("Use `<AdBreak />` like this").problems, []);
});

test("every existing article converts cleanly and keeps its boxes", () => {
  const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith(".mdx") && !f.startsWith("_"));
  assert.ok(files.length > 0);
  for (const file of files) {
    const raw = fs.readFileSync(path.join(articlesDir, file), "utf8");
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
    YAML.parse(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);
    const { markdown, problems } = mdxToMarkdown(body);
    assert.deepEqual(problems, [], `${file}: ${problems.join("; ")}`);

    const html = renderToStaticMarkup(createElement(Markdown, { remarkPlugins, rehypePlugins, skipHtml: true }, markdown));
    const count = (re) => (body.match(re) || []).length;
    const blocks = (name) => (html.match(new RegExp(`data-block="${name}"`, "g")) || []).length;
    assert.equal(blocks("key-takeaways"), count(/<KeyTakeaways>/g), `${file}: key takeaways`);
    assert.equal(blocks("callout"), count(/<Callout[\s>]/g), `${file}: callouts`);
    assert.equal(blocks("ad-break"), count(/<AdBreak\s*\/>/g), `${file}: ad breaks`);
    assert.ok(!html.includes("&lt;Callout"), `${file}: leftover Callout text`);
  }
});
