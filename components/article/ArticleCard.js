import Link from "next/link";
import FeaturedImage from "./FeaturedImage";
import CategoryBadge from "./CategoryBadge";
import { formatDate } from "@/lib/format";

function DraftBadge({ status }) {
  if (status !== "draft") return null;
  return (
    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-900 uppercase">
      Draft
    </span>
  );
}

export default function ArticleCard({ article, variant = "default", headingLevel = 3 }) {
  const Heading = `h${headingLevel}`;
  const href = `/blog/${article.slug}`;

  if (variant === "compact") {
    return (
      <article className="group">
        <CategoryBadge slug={article.category} />
        <Heading className="mt-1 font-serif text-base leading-snug font-semibold text-navy-950">
          <Link href={href} className="group-hover:text-leaf-700">
            {article.title}
          </Link>
          <DraftBadge status={article.status} />
        </Heading>
        <p className="mt-1 text-xs text-navy-500">
          <time dateTime={article.date}>{formatDate(article.date)}</time> · {article.readingMinutes} min read
        </p>
      </article>
    );
  }

  if (variant === "horizontal") {
    return (
      <article className="group grid gap-4 sm:grid-cols-[220px_1fr] sm:gap-6">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block overflow-hidden rounded-lg">
          <FeaturedImage image={article.image} sizes="(min-width: 640px) 220px, 100vw" className="transition-transform duration-300 group-hover:scale-[1.02]" />
        </Link>
        <div>
          <CategoryBadge slug={article.category} />
          <Heading className="mt-1.5 font-serif text-xl leading-snug font-semibold text-navy-950">
            <Link href={href} className="group-hover:text-leaf-700">
              {article.title}
            </Link>
            <DraftBadge status={article.status} />
          </Heading>
          <p className="mt-2 line-clamp-2 text-[0.95rem] leading-relaxed text-navy-600">{article.description}</p>
          <p className="mt-2 text-xs text-navy-500">
            <time dateTime={article.date}>{formatDate(article.date)}</time> · {article.readingMinutes} min read
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block overflow-hidden rounded-lg">
        <FeaturedImage
          image={article.image}
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          className="transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </Link>
      <div className="mt-4">
        <CategoryBadge slug={article.category} />
        <Heading className="mt-1.5 font-serif text-xl leading-snug font-semibold text-navy-950">
          <Link href={href} className="group-hover:text-leaf-700">
            {article.title}
          </Link>
          <DraftBadge status={article.status} />
        </Heading>
        <p className="mt-2 line-clamp-3 text-[0.95rem] leading-relaxed text-navy-600">{article.description}</p>
        <p className="mt-3 text-xs text-navy-500">
          <time dateTime={article.date}>{formatDate(article.date)}</time> · {article.readingMinutes} min read
        </p>
      </div>
    </article>
  );
}
