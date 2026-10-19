import Link from "next/link";
import { AuthorAvatar } from "./AuthorBox";
import { formatDate } from "@/lib/format";

export default function ArticleMeta({ article, author }) {
  return (
    <div className="flex items-center gap-3">
      <AuthorAvatar author={author} size="h-10 w-10 text-sm" />
      <div className="text-sm text-navy-600">
        <p>
          By{" "}
          {author.slug ? (
            <Link href={`/authors/${author.slug}`} className="font-medium text-navy-900 hover:text-leaf-700">
              {author.name}
            </Link>
          ) : (
            <span className="font-medium text-navy-900">{author.name}</span>
          )}
        </p>
        <p className="flex flex-wrap gap-x-2">
          <span>
            {article.date ? (
              <>
                Published <time dateTime={article.date}>{formatDate(article.date)}</time>
              </>
            ) : (
              "Not yet published"
            )}
          </span>
          {article.updated && article.updated !== article.date && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Updated <time dateTime={article.updated}>{formatDate(article.updated)}</time>
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{article.readingMinutes} min read</span>
        </p>
      </div>
    </div>
  );
}
