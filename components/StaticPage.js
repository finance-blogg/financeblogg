import PageHeader from "@/components/layout/PageHeader";
import MdxContent from "@/components/mdx/MdxContent";
import { getPage } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export function staticPageMetadata(slug, path) {
  const page = getPage(slug);
  if (!page) throw new Error(`[content] missing content/pages/${slug}.mdx`);
  return pageMetadata({ title: page.title, description: page.description, path });
}

export default function StaticPage({ slug, children }) {
  const page = getPage(slug);
  if (!page) throw new Error(`[content] missing content/pages/${slug}.mdx`);
  return (
    <>
      <PageHeader title={page.title} description={page.description} breadcrumbs={[{ name: page.title }]}>
        {page.updated && (
          <p className="mt-4 text-sm text-navy-500">
            Last updated: <time dateTime={page.updated}>{formatDate(page.updated)}</time>
          </p>
        )}
      </PageHeader>
      <div className="container-page mt-10">
        <div className="article-prose max-w-3xl">
          <MdxContent source={page.body} />
        </div>
        {children}
      </div>
    </>
  );
}
