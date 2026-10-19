import Link from "next/link";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";
import { primaryNav } from "./nav-links";
import { getCategories } from "@/lib/content";

export default async function Header() {
  const categories = await getCategories();
  return (
    <header className="sticky top-0 z-50 border-b border-navy-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-navy-900 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-[0.95rem] font-medium text-navy-700">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-leaf-700">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <form action="/search" method="get" role="search" className="hidden w-64 lg:flex">
          <label htmlFor="header-search" className="sr-only">
            Search articles
          </label>
          <div className="relative w-full">
            <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden="true">
              <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M14 14l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              id="header-search"
              type="search"
              name="q"
              maxLength={100}
              placeholder="Search articles"
              className="h-10 w-full rounded-full border border-navy-200 bg-navy-50/60 pr-3 pl-9 text-sm placeholder:text-navy-400 focus:border-leaf-600 focus:bg-white focus:outline-none"
            />
          </div>
        </form>

        <MobileMenu primary={primaryNav} categories={categories} />
      </div>

      <nav aria-label="Topics" className="hidden border-t border-navy-100 lg:block">
        <ul className="container-page flex h-11 items-center gap-6 overflow-x-auto text-sm whitespace-nowrap text-navy-600">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/category/${c.slug}`} className="transition-colors hover:text-leaf-700">
                {c.shortName}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
