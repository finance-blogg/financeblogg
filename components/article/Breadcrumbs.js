import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

/** items: [{ name, href? }]. The last item is the current page. */
export default function Breadcrumbs({ items }) {
  const all = [{ name: "Home", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-navy-500">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {all.map((item, i) => {
            const last = i === all.length - 1;
            return (
              <li key={`${item.name}-${i}`} className="flex items-center gap-2">
                {last || !item.href ? (
                  <span aria-current={last ? "page" : undefined} className="line-clamp-1 text-navy-700">
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-leaf-700">
                    {item.name}
                  </Link>
                )}
                {!last && <span aria-hidden="true" className="text-navy-300">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(all)} />
    </>
  );
}
