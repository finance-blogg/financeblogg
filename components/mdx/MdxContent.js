import { compileMDX } from "next-mdx-remote/rsc";
import { cacheLife } from "next/cache";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { mdxComponents } from "./mdx-components";

export default async function MdxContent({ source }) {
  "use cache";
  cacheLife("max");

  const { content } = await compileMDX({
    source,
    components: mdxComponents,
    options: {
      blockJS: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug],
      },
    },
  });
  return content;
}
