"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileMenu({ primary, categories }) {
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(null);
  const pathname = usePathname();
  const panelId = useId();

  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-navy-100 text-navy-900 hover:bg-navy-50"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 h-[calc(100dvh-4rem)] overflow-y-auto border-t border-navy-100 bg-white"
      >
        <nav aria-label="Mobile" className="container-page py-6">
          <form action="/search" method="get" role="search" className="mb-6 flex gap-2">
            <label htmlFor={`${panelId}-q`} className="sr-only">
              Search articles
            </label>
            <input
              id={`${panelId}-q`}
              type="search"
              name="q"
              maxLength={100}
              placeholder="Search articles"
              className="h-11 min-w-0 flex-1 rounded-md border border-navy-200 px-3 text-base focus:border-leaf-600 focus:outline-none"
            />
            <button type="submit" className="h-11 rounded-md bg-navy-900 px-4 font-medium text-white">
              Search
            </button>
          </form>

          <p className="eyebrow mb-2">Topics</p>
          <ul className="mb-6 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className="block rounded-md px-2 py-2.5 text-base text-navy-800 hover:bg-navy-50"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>

          <p className="eyebrow mb-2">{"Publication"}</p>
          <ul className="grid gap-1">
            {primary.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block rounded-md px-2 py-2.5 text-base text-navy-800 hover:bg-navy-50">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
