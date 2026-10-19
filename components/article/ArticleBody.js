import AdSlot from "@/components/ads/AdSlot";
import MdxContent from "@/components/mdx/MdxContent";
import MarkdownContent from "@/components/markdown/MarkdownContent";

/** MDX files keep their original renderer; database articles use sanitised Markdown. */
export default function ArticleBody({ article, showAds = true }) {
  if (article.bodyFormat === "mdx") return <MdxContent source={article.body} />;
  return (
    <MarkdownContent
      source={article.body}
      renderAdBreak={showAds ? () => <AdSlot placement="articleInline" /> : undefined}
    />
  );
}
