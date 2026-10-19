import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkCmsDirectives from "./remark-cms-directives.js";
import { sanitizeSchema } from "./sanitize-schema.js";

/** Shared by MarkdownContent and the renderer tests. Slugs are added after sanitising so ids match the TOC. */
export const remarkPlugins = [remarkGfm, remarkDirective, remarkCmsDirectives];
export const rehypePlugins = [[rehypeSanitize, sanitizeSchema], rehypeSlug];
