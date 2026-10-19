import Link from "next/link";
import { getCategory } from "@/lib/content";

export default async function CategoryBadge({ slug, link = true }) {
  const category = slug ? await getCategory(slug) : null;
  if (!category) return null;
  const className =
    "inline-block text-xs font-semibold tracking-[0.1em] text-leaf-700 uppercase";
  if (!link) return <span className={className}>{category.name}</span>;
  return (
    <Link href={`/category/${category.slug}`} className={`${className} hover:text-leaf-800`}>
      {category.name}
    </Link>
  );
}
