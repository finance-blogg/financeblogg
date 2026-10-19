import Link from "next/link";

/** Crawlable numbered pagination. `basePath` is page 1; later pages live at `${basePath}/page/N`. */
export function pageHref(basePath, page) {
  return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

export default function Pagination({ basePath, page, totalPages }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const item = "inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-sm font-medium";
  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center gap-2">
      {page > 1 && (
        <Link href={pageHref(basePath, page - 1)} rel="prev" className={`${item} text-navy-700 ring-1 ring-navy-200 hover:text-leaf-700`}>
          ← Newer
        </Link>
      )}
      {pages.map((p) =>
        p === page ? (
          <span key={p} aria-current="page" className={`${item} bg-navy-900 text-white`}>
            {p}
          </span>
        ) : (
          <Link key={p} href={pageHref(basePath, p)} className={`${item} text-navy-700 ring-1 ring-navy-200 hover:text-leaf-700`}>
            <span className="sr-only">Page </span>
            {p}
          </Link>
        )
      )}
      {page < totalPages && (
        <Link href={pageHref(basePath, page + 1)} rel="next" className={`${item} text-navy-700 ring-1 ring-navy-200 hover:text-leaf-700`}>
          Older →
        </Link>
      )}
    </nav>
  );
}
