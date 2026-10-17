const variants = {
  note: { label: "Note", box: "border-navy-200 bg-navy-50", tag: "text-navy-700" },
  example: { label: "Illustrative example", box: "border-leaf-200 bg-leaf-50", tag: "text-leaf-700" },
  opinion: { label: "Our view (opinion)", box: "border-navy-300 bg-white", tag: "text-navy-700" },
  estimate: { label: "Estimate, not a guarantee", box: "border-amber-200 bg-amber-50", tag: "text-amber-800" },
  warning: { label: "Be careful", box: "border-red-200 bg-red-50", tag: "text-red-800" },
  verify: { label: "Check the current rule", box: "border-amber-300 bg-amber-50", tag: "text-amber-900" },
};

/**
 * Labels content as an example, opinion, estimate, etc. so readers can
 * distinguish facts from illustrations and editorial views.
 */
export default function Callout({ type = "note", title, children }) {
  const v = variants[type] || variants.note;
  return (
    <aside className={`not-prose my-8 rounded-lg border-l-4 ${v.box} px-5 py-4`}>
      <p className={`text-xs font-semibold tracking-[0.1em] uppercase ${v.tag}`}>{v.label}</p>
      {title && <p className="mt-1 font-serif text-lg font-semibold text-navy-950">{title}</p>}
      <div className="callout-body mt-2 space-y-3 text-[1rem] leading-relaxed text-navy-800">{children}</div>
    </aside>
  );
}
