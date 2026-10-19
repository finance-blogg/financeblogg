import Link from "next/link";

export function AuthorAvatar({ author, size = "h-14 w-14" }) {
  const initials = author.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`${size} inline-flex shrink-0 items-center justify-center rounded-full bg-navy-900 font-serif text-lg font-semibold text-white`}
    >
      {initials}
    </span>
  );
}

export default function AuthorBox({ author }) {
  if (!author?.slug) return null;
  return (
    <section aria-labelledby="author-heading" className="mt-12 flex gap-4 rounded-lg border border-navy-100 p-5 sm:p-6">
      <AuthorAvatar author={author} />
      <div>
        <p className="eyebrow">About the author</p>
        <h2 id="author-heading" className="mt-1 font-serif text-lg font-semibold text-navy-950">
          <Link href={`/authors/${author.slug}`} className="hover:text-leaf-700">
            {author.name}
          </Link>
        </h2>
        {author.role && <p className="text-sm text-navy-500">{author.role}</p>}
        {author.bio && <p className="mt-2 text-[0.95rem] leading-relaxed text-navy-700">{author.bio}</p>}
        <Link href={`/authors/${author.slug}`} className="mt-3 inline-block text-sm font-medium text-leaf-700 hover:underline">
          View profile and articles
        </Link>
      </div>
    </section>
  );
}
