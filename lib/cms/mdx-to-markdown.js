import { CALLOUT_TYPES } from "../../components/markdown/remark-cms-directives.js";

/**
 * Converts the MDX components used by the existing articles into the
 * directive syntax understood by the database article renderer:
 *
 *   <KeyTakeaways> … </KeyTakeaways>         → :::key-takeaways … :::
 *   <Callout type="x" title="y"> … </Callout> → :::callout{type="x" title="y"} … :::
 *   <AdBreak />                               → ::ad-break
 *   <OwnerTodo>text</OwnerTodo>              → **[OWNER_TODO: text]**
 *
 * Anything else that would not survive the conversion is reported in
 * `problems`, and the import script refuses to import that article.
 */

function quoteAttribute(value) {
  if (!value.includes('"')) return `"${value}"`;
  if (!value.includes("'")) return `'${value}'`;
  return `"${value.replace(/"/g, "”")}"`;
}

function parseAttributes(text) {
  const attrs = {};
  for (const match of text.matchAll(/([a-zA-Z]+)\s*=\s*"([^"]*)"/g)) attrs[match[1]] = match[2];
  return attrs;
}

function outsideCode(text) {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

export function mdxToMarkdown(source) {
  const problems = [];
  let out = String(source || "").replace(/\r\n/g, "\n");

  out = out.replace(/^[ \t]*<KeyTakeaways>[ \t]*$/gm, ":::key-takeaways");
  out = out.replace(/^[ \t]*<\/KeyTakeaways>[ \t]*$/gm, ":::");
  out = out.replace(/^[ \t]*<Callout((?:\s+[a-zA-Z]+\s*=\s*"[^"]*")*)\s*>[ \t]*$/gm, (_, rawAttrs) => {
    const attrs = parseAttributes(rawAttrs);
    const unknown = Object.keys(attrs).filter((k) => !["type", "title"].includes(k));
    if (unknown.length) problems.push(`Callout has unsupported attributes: ${unknown.join(", ")}`);
    const type = attrs.type || "note";
    if (!CALLOUT_TYPES.includes(type)) problems.push(`Callout type "${type}" is not supported`);
    return `:::callout{type="${type}"${attrs.title ? ` title=${quoteAttribute(attrs.title)}` : ""}}`;
  });
  out = out.replace(/^[ \t]*<\/Callout>[ \t]*$/gm, ":::");
  out = out.replace(/^[ \t]*<AdBreak\s*\/>[ \t]*$/gm, "::ad-break");
  out = out.replace(/<OwnerTodo>([\s\S]*?)<\/OwnerTodo>/g, (_, text) => `**[OWNER_TODO: ${text.trim()}]**`);

  const prose = outsideCode(out);
  for (const tag of new Set(prose.match(/<\/?[A-Za-z][A-Za-z0-9.-]*(\s[^>]*)?\/?>/g) || [])) {
    problems.push(`Unconverted tag ${tag.slice(0, 60)}`);
  }
  if (/^\s*(import|export)\s/m.test(prose)) problems.push("MDX import/export statements are not supported");

  let depth = 0;
  for (const line of prose.split("\n")) {
    if (/^:::[a-z-]+/.test(line)) {
      depth += 1;
      if (depth > 1) problems.push("Nested boxes (a callout inside another box) are not supported");
    } else if (/^:::\s*$/.test(line)) {
      depth -= 1;
      if (depth < 0) problems.push("A closing ::: has no matching opening box");
    }
  }
  if (depth > 0) problems.push("A box is opened but never closed");

  return { markdown: out.trim() + "\n", problems: [...new Set(problems)] };
}
