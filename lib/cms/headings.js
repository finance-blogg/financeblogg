import GithubSlugger from "github-slugger";

function plainHeadingText(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

/** Mirrors rehype-slug (github-slugger) so TOC links match rendered heading ids. */
export function extractHeadings(body) {
  const slugger = new GithubSlugger();
  const headings = [];
  let inFence = false;
  for (const line of String(body || "").split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const text = plainHeadingText(match[2]);
    headings.push({ depth: match[1].length, text, id: slugger.slug(text) });
  }
  return headings;
}

/** Plain text of a Markdown body, for word counts and search. */
export function markdownToPlainText(body) {
  return String(body || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*:{2,}[a-z-]*(\{[^}]*\})?\s*$/gim, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const WORDS_PER_MINUTE = 200;

export function textStats(body) {
  const plain = markdownToPlainText(body);
  const wordCount = plain ? plain.split(" ").length : 0;
  return { wordCount, readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)) };
}
