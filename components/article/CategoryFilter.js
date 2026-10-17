import Link from "next/link";

/** Category chips as plain links, so each filter has its own crawlable URL. */
export default function CategoryFilter({ categories, active }) {
  const base = "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors";
  return (
    <nav aria-label="Filter by category" className="mt-6">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/blog"
            aria-current={!active ? "page" : undefined}
            className={`${base} ${!active ? "bg-navy-900 text-white" : "bg-white text-navy-700 ring-1 ring-navy-200 hover:text-leaf-700"}`}
          >
            All
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/category/${c.slug}`}
              aria-current={active === c.slug ? "page" : undefined}
              className={`${base} ${active === c.slug ? "bg-navy-900 text-white" : "bg-white text-navy-700 ring-1 ring-navy-200 hover:text-leaf-700"}`}
            >
              {c.name}
              {typeof c.count === "number" && <span className="ml-1.5 text-xs opacity-70">{c.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
