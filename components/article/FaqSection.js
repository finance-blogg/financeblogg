/**
 * Visible FAQ block that must stay in sync with faqPageJsonLd() for rich results.
 */
export default function FaqSection({ faqs }) {
  const items = Array.isArray(faqs) ? faqs.filter((f) => f?.question && f?.answer) : [];
  if (!items.length) return null;

  return (
    <section className="not-prose mt-12 border-t border-navy-100 pt-10" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="font-serif text-2xl font-semibold text-navy-950">
        Common questions
      </h2>
      <dl className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.question} className="rounded-lg border border-navy-100 bg-navy-50/40 px-5 py-4">
            <dt className="font-semibold text-navy-950">{item.question}</dt>
            <dd className="mt-2 text-[0.95rem] leading-relaxed text-navy-700">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
