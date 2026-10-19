import Link from "next/link";
import StaticPage, { staticPageMetadata } from "@/components/StaticPage";
import { AuthorAvatar } from "@/components/article/AuthorBox";
import { getAllAuthors } from "@/lib/content";

export const metadata = staticPageMetadata("about", "/about");

export default async function AboutPage() {
  const authors = await getAllAuthors();
  return (
    <StaticPage slug="about">
      {authors.length > 0 && (
        <section aria-labelledby="team-heading" className="mt-12 max-w-3xl border-t border-navy-100 pt-10">
          <h2 id="team-heading" className="font-serif text-2xl font-semibold text-navy-950">
            Who writes for us
          </h2>
          <ul className="mt-6 space-y-6">
            {authors.map((a) => (
              <li key={a.slug} className="flex gap-4">
                <AuthorAvatar author={a} />
                <div>
                  <Link href={`/authors/${a.slug}`} className="font-serif text-lg font-semibold text-navy-950 hover:text-leaf-700">
                    {a.name}
                  </Link>
                  {a.role && <p className="text-sm text-navy-500">{a.role}</p>}
                  {a.bio && <p className="mt-1 text-[0.95rem] text-navy-700">{a.bio}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </StaticPage>
  );
}
