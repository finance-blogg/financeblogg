#!/usr/bin/env node
/**
 * Checks that every source URL in article frontmatter responds.
 * A passing check only means the page loads; a human still needs to confirm
 * that it supports the claim it is cited for.
 *
 *   npm run check:links
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const dir = path.join(process.cwd(), "content", "articles");
const urls = new Map();

for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))) {
  const raw = fs.readFileSync(path.join(dir, name), "utf8");
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) continue;
  const data = YAML.parse(fm[1]) || {};
  for (const s of data.sources || []) {
    if (!urls.has(s.url)) urls.set(s.url, new Set());
    urls.get(s.url).add(name);
  }
  for (const m of raw.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)) {
    if (!urls.has(m[1])) urls.set(m[1], new Set());
    urls.get(m[1]).add(name);
  }
}

async function check(url) {
  const opts = { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "User-Agent": "Mozilla/5.0 (link checker)" } };
  try {
    let res = await fetch(url, { ...opts, method: "HEAD" });
    if (res.status >= 400) res = await fetch(url, { ...opts, method: "GET" });
    return { url, status: res.status, ok: res.ok };
  } catch (error) {
    return { url, status: error.name === "TimeoutError" ? "timeout" : error.cause?.code || error.message, ok: false };
  }
}

const results = [];
const list = [...urls.keys()];
for (let i = 0; i < list.length; i += 6) {
  results.push(...(await Promise.all(list.slice(i, i + 6).map(check))));
}

let failures = 0;
for (const r of results.sort((a, b) => Number(a.ok) - Number(b.ok))) {
  if (!r.ok) failures++;
  console.log(`${r.ok ? "OK  " : "FAIL"} ${String(r.status).padEnd(8)} ${r.url}${r.ok ? "" : `  (${[...urls.get(r.url)].join(", ")})`}`);
}
console.log(`\n${results.length - failures}/${results.length} links responded successfully.`);
if (failures) {
  console.log("Some official sites block automated requests; open failing links in a browser before changing them.");
  process.exit(1);
}
