import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import { rehypePlugins, remarkPlugins } from "../../components/markdown/pipeline.js";
import { extractHeadings } from "../../lib/cms/headings.js";

function render(source) {
  return renderToStaticMarkup(createElement(Markdown, { remarkPlugins, rehypePlugins, skipHtml: true }, source));
}

test("scripts, event handlers and javascript: URLs never reach the output", () => {
  const payloads = [
    "<script>alert(1)</script>",
    '<img src="x" onerror="alert(1)">',
    '<iframe src="https://evil.example"></iframe>',
    "[click](javascript:alert(1))",
    "[click](JAVASCRIPT:alert(1))",
    "[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)",
    "![x](javascript:alert(1))",
    '<a href="javascript:alert(1)">x</a>',
    "<style>body{display:none}</style>",
    ':::callout{type="note" title="<img src=x onerror=alert(1)>"}\nhi\n:::',
    ":::callout{onclick=\"alert(1)\"}\nhi\n:::",
  ];
  for (const payload of payloads) {
    const html = render(payload).toLowerCase();
    assert.ok(!html.includes("<script"), `script tag from ${payload}`);
    assert.ok(!html.includes("<iframe"), `iframe from ${payload}`);
    assert.ok(!html.includes("<style"), `style from ${payload}`);
    // React always quotes attributes, so a real handler would appear as on…="…".
    assert.ok(!/\son[a-z]+="/.test(html), `event handler from ${payload}: ${html}`);
    assert.ok(!/<img[^>]*onerror/.test(html), `unescaped img from ${payload}`);
    assert.ok(!html.includes("javascript:"), `javascript: URL from ${payload}`);
    assert.ok(!html.includes("data:text/html"), `data URL from ${payload}`);
  }
});

test("standard formatting renders", () => {
  const html = render(
    [
      "## Section one",
      "",
      "Text with **bold**, *italic* and a [link](/blog/x).",
      "",
      "- one",
      "- two",
      "",
      "1. first",
      "2. second",
      "",
      "> A quote",
      "",
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
    ].join("\n")
  );
  assert.match(html, /<h2 id="section-one">Section one<\/h2>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<a href="\/blog\/x">link<\/a>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<ol>/);
  assert.match(html, /<blockquote>/);
  assert.match(html, /<table>/);
});

test("heading ids match the table of contents", () => {
  const body = "## What is a SIP?\n\ntext\n\n### Costs & charges\n\n## What is a SIP?";
  const html = render(body);
  for (const h of extractHeadings(body)) assert.ok(html.includes(`id="${h.id}"`), `missing id ${h.id}`);
});

test("supported directives become marked blocks; anything else stays as text", () => {
  const html = render(
    [":::key-takeaways", "- Point", ":::", "", ':::callout{type="example" title="Worked example"}', "Body", ":::", "", "::ad-break", "", "A ratio of 3:1 and Note:this stays."].join("\n")
  );
  assert.match(html, /data-block="key-takeaways"/);
  assert.match(html, /data-block="callout" data-type="example" data-title="Worked example"/);
  assert.match(html, /data-block="ad-break"/);
  assert.match(html, /3:1/);
  assert.match(html, /Note:this stays/);
});

test("unknown callout types fall back to a note", () => {
  const html = render(':::callout{type="scam"}\nx\n:::');
  assert.match(html, /data-type="note"/);
});
