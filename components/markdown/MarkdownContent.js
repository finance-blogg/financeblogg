import Markdown from "react-markdown";
import Link from "next/link";
import Callout from "../mdx/Callout";
import KeyTakeaways from "../content/KeyTakeaways";
import { rehypePlugins, remarkPlugins } from "./pipeline";

/**
 * Renders article bodies stored in the database. Used by public article
 * pages, admin previews and the editor's live preview, so all three match.
 *
 * Safety: raw HTML is dropped (skipHtml), the output is sanitised with a
 * GitHub-style allowlist and unsafe URL schemes are removed, so stored
 * content cannot run scripts. Unlike the MDX files, nothing here is executed.
 */

function MarkdownLink({ href = "", children, title }) {
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} title={title} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function MarkdownImage({ src = "", alt = "", title }) {
  if (!src) return null;
  // Inline body images keep their own dimensions; featured images use next/image.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} title={title} loading="lazy" decoding="async" className="h-auto max-w-full rounded-lg" />;
}

export default function MarkdownContent({ source, renderAdBreak }) {
  const components = {
    a: ({ href, title, children }) => (
      <MarkdownLink href={href} title={title}>
        {children}
      </MarkdownLink>
    ),
    img: ({ src, alt, title }) => <MarkdownImage src={src} alt={alt} title={title} />,
    // The article title is the page's only H1.
    h1: ({ id, children }) => <h2 id={id}>{children}</h2>,
    div: ({ node, children, className }) => {
      const block = node?.properties?.dataBlock;
      if (block === "key-takeaways") return <KeyTakeaways>{children}</KeyTakeaways>;
      if (block === "callout") {
        return (
          <Callout type={node.properties.dataType} title={node.properties.dataTitle || undefined}>
            {children}
          </Callout>
        );
      }
      if (block === "ad-break") return renderAdBreak ? renderAdBreak() : null;
      return <div className={className}>{children}</div>;
    },
  };

  return (
    <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components} skipHtml>
      {String(source || "")}
    </Markdown>
  );
}
