export default function SourcesList({ sources }) {
  if (!sources || sources.length === 0) return null;
  return (
    <section aria-labelledby="sources-heading" className="mt-12 border-t border-navy-100 pt-8">
      <h2 id="sources-heading" className="font-serif text-xl font-semibold text-navy-950">
        Sources and further reading
      </h2>
      <p className="mt-2 text-sm text-navy-600">
        We link to official and primary sources wherever possible. Rules and rates change, so check
        the latest version on the source website.
      </p>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-[0.95rem] text-navy-700 marker:text-navy-400">
        {sources.map((s) => (
          <li key={s.url + s.title}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-leaf-700 underline decoration-leaf-200 underline-offset-4 hover:decoration-leaf-600">
              {s.title}
            </a>
            {s.publisher && <span className="text-navy-500"> — {s.publisher}</span>}
            {s.note && <span className="block text-sm text-navy-500">{s.note}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
