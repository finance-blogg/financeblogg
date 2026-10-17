import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ArticleCard from "@/components/article/ArticleCard";
import { AuthorAvatar } from "@/components/article/AuthorBox";
import JsonLd from "@/components/seo/JsonLd";
import { getAllAuthors, getArticlesByAuthor, getAuthor } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const ensureStatic = "navigation";
export const instant = false;

export function generateStaticParams() {
  const authors = getAllAuthors();
  return authors.length ? authors.map((a) => ({ slug: a.slug })) : [{ slug: "no-authors-yet" }];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) return { title: "Author not found", robots: { index: false } };
  return pageMetadata({
    title: `${author.name}${author.role ? `, ${author.role}` : ""}`,
    description: author.bio ? author.bio.slice(0, 155) : `Articles by ${author.name}.`,
    path: `/authors/${author.slug}`,
    ogType: "profile",
  });
}

export default async function AuthorPage({ params }) {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) notFound();

  const articles = getArticlesByAuthor(slug);
  const sameAs = Object.values(author.links).filter((v) => typeof v === "string" && v.startsWith("https://"));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": author.isOrganization ? "Organization" : "Person",
            name: author.name,
            url: absoluteUrl(`/authors/${author.slug}`),
            ...(author.role ? { jobTitle: author.role } : {}),
            ...(author.bio ? { description: author.bio } : {}),
            ...(sameAs.length ? { sameAs } : {}),
          },
        }}
      />
      <PageHeader breadcrumbs={[{ name: "Authors" }, { name: author.name }]} title={author.name} eyebrow={author.role || "Author"}>
        <div className="mt-6 flex max-w-3xl flex-col gap-5 sm:flex-row">
          <AuthorAvatar author={author} size="h-20 w-20 text-2xl" />
          <div className="space-y-4 text-[1.05rem] leading-relaxed text-navy-700">
            {author.bio && <p>{author.bio}</p>}
            {author.expertise.length > 0 && (
              <p>
                <span className="font-medium text-navy-900">Covers: </span>
                {author.expertise.join(", ")}
              </p>
            )}
            {author.credentials.length > 0 && (
              <div>
                <p className="font-medium text-navy-900">Qualifications</p>
                <ul className="mt-1 list-disc pl-5">
                  {author.credentials.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {sameAs.length > 0 && (
              <ul className="flex flex-wrap gap-3 text-sm">
                {Object.entries(author.links)
                  .filter(([, v]) => typeof v === "string" && v.startsWith("https://"))
                  .map(([k, v]) => (
                    <li key={k}>
                      <a href={v} target="_blank" rel="noopener noreferrer me" className="link-underline capitalize">
                        {k}
                      </a>
                    </li>
                  ))}
              </ul>
            )}
            <p className="text-sm text-navy-500">
              Read about how articles are researched and reviewed in our{" "}
              <Link href="/editorial-policy" className="link-underline">editorial policy</Link>.
            </p>
          </div>
        </div>
      </PageHeader>

      <div className="container-page mt-12">
        <h2 className="font-serif text-2xl font-semibold text-navy-950">Articles</h2>
        {articles.length === 0 ? (
          <p className="mt-4 text-navy-600">No published articles yet.</p>
        ) : (
          <div className="mt-6 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
