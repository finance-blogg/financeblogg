import Link from "next/link";
import { formatDate } from "@/lib/format";

/**
 * Reader-facing review information, plus a development-only checklist for
 * articles whose facts have not yet been verified by a human editor.
 */
export default function EditorialInfo({ article, reviewer }) {
  const { review } = article;
  const showDevNotice = process.env.NODE_ENV === "development" && review.factCheck !== "verified";

  return (
    <>
      {showDevNotice && (
        <aside className="not-prose mb-8 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-950" aria-label="Fact-check required">
          <p className="font-semibold">Fact-check required before publication (visible in development only)</p>
          <p className="mt-1">
            Set <code>review.factCheck: verified</code> in the frontmatter only after a human editor has
            checked every figure, rule and link against the current official source.
          </p>
          {review.notes.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {review.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {review.factCheck === "verified" && (reviewer || review.reviewedOn) && (
        <p className="text-sm text-navy-600">
          <span className="inline-flex items-center gap-1.5 font-medium text-leaf-700">
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d="M5 10.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Editorially reviewed
          </span>
          {reviewer && (
            <>
              {" "}by{" "}
              <Link href={`/authors/${reviewer.slug}`} className="link-underline">
                {reviewer.name}
              </Link>
            </>
          )}
          {review.reviewedOn && (
            <>
              {" "}on <time dateTime={review.reviewedOn}>{formatDate(review.reviewedOn)}</time>
            </>
          )}
          . <Link href="/editorial-policy" className="link-underline">How we review articles</Link>
        </p>
      )}
    </>
  );
}
