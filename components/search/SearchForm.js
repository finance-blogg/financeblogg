import { getCategories } from "@/lib/content";

/**
 * Plain GET form so search works without JavaScript and produces shareable URLs.
 */
export default async function SearchForm({
  defaultQuery = "",
  defaultCategory = "",
  showCategory = false,
  size = "md",
  id = "site-search",
  className = "",
}) {
  const categories = showCategory ? await getCategories() : [];
  const inputSize = size === "lg" ? "h-12 text-base" : "h-10 text-sm";
  return (
    <form action="/search" method="get" role="search" className={`flex w-full gap-2 ${className}`}>
      <label htmlFor={id} className="sr-only">
        Search articles
      </label>
      <input
        id={id}
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Search articles"
        maxLength={100}
        autoComplete="off"
        className={`${inputSize} min-w-0 flex-1 rounded-md border border-navy-200 bg-white px-3 text-navy-900 placeholder:text-navy-400 focus:border-leaf-600 focus:outline-none focus:ring-2 focus:ring-leaf-100`}
      />
      {showCategory && (
        <>
          <label htmlFor={`${id}-category`} className="sr-only">
            Filter by category
          </label>
          <select
            id={`${id}-category`}
            name="category"
            defaultValue={defaultCategory}
            className={`${inputSize} max-w-[11rem] rounded-md border border-navy-200 bg-white px-2 text-navy-800 focus:border-leaf-600 focus:outline-none focus:ring-2 focus:ring-leaf-100`}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </>
      )}
      <button
        type="submit"
        className={`${inputSize} shrink-0 rounded-md bg-navy-900 px-4 font-medium text-white transition-colors hover:bg-navy-800`}
      >
        Search
      </button>
    </form>
  );
}
