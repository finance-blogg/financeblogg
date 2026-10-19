export default function KeyTakeaways({ children }) {
  return (
    <aside className="not-prose my-8 rounded-lg bg-navy-950 px-6 py-5 text-navy-100" aria-label="Key takeaways">
      <p className="text-xs font-semibold tracking-[0.12em] text-leaf-200 uppercase">Key takeaways</p>
      <div className="mt-3 text-[1rem] leading-relaxed [&_li]:mt-2 [&_li]:ml-5 [&_strong]:text-white [&_ul]:list-disc [&_ul]:marker:text-leaf-500">
        {children}
      </div>
    </aside>
  );
}
