export default function TableOfContents({ headings, className = "" }) {
  if (!headings || headings.filter((h) => h.depth === 2).length < 3) return null;
  return (
    <nav aria-labelledby="toc-heading" className={`rounded-lg border border-navy-100 bg-navy-50/60 p-5 ${className}`}>
      <h2 id="toc-heading" className="text-sm font-semibold tracking-wide text-navy-950 uppercase">
        In this article
      </h2>
      <ol className="mt-3 space-y-1.5 text-[0.95rem]">
        {headings.map((h) => (
          <li key={h.id} className={h.depth === 3 ? "pl-4 text-sm" : ""}>
            <a href={`#${h.id}`} className="text-navy-700 hover:text-leaf-700 hover:underline">
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
