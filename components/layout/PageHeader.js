import Breadcrumbs from "@/components/article/Breadcrumbs";

export default function PageHeader({ eyebrow, title, description, breadcrumbs, children }) {
  return (
    <div className="border-b border-navy-100 bg-gradient-to-b from-navy-50/70 to-white">
      <div className="container-page py-8 sm:py-12">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        {eyebrow && <p className="eyebrow mt-6">{eyebrow}</p>}
        <h1 className={`${eyebrow ? "mt-2" : "mt-6"} font-serif text-3xl font-semibold text-navy-950 sm:text-4xl`}>{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-navy-600">{description}</p>}
        {children}
      </div>
    </div>
  );
}
