"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/layout/Logo";
import { signOut } from "@/app/admin/actions/auth";
import { button, cx } from "./ui";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/articles", label: "Articles", exact: false, exclude: "/admin/articles/new" },
  { href: "/admin/articles/new", label: "New article", exact: true },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/settings", label: "Settings & authors" },
];

function isActive(pathname, link) {
  if (link.exact) return pathname === link.href;
  if (link.exclude && pathname.startsWith(link.exclude)) return false;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export default function AdminNav({ email }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  return (
    <header className="border-b border-navy-800 bg-navy-950 text-navy-100 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex h-16 items-center justify-between px-4 lg:h-20 lg:px-5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <span className="font-serif text-lg font-semibold text-white">Dashboard</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-nav"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white ring-1 ring-navy-700 lg:hidden"
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
      </div>

      <div id="admin-nav" className={cx(open ? "block" : "hidden", "px-3 pb-4 lg:flex lg:flex-1 lg:flex-col lg:pb-6")}>
        <nav aria-label="Dashboard">
          <ul className="space-y-1">
            {LINKS.map((link) => {
              const active = isActive(pathname, link);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "block rounded-md px-3 py-2 text-sm font-medium",
                      active ? "bg-navy-800 text-white" : "text-navy-200 hover:bg-navy-900 hover:text-white"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-6 border-t border-navy-800 pt-4 lg:mt-auto">
          <a href="/" target="_blank" rel="noopener noreferrer" className="block rounded-md px-3 py-2 text-sm text-navy-200 hover:bg-navy-900 hover:text-white">
            View public site ↗
          </a>
          <p className="mt-3 truncate px-3 text-xs text-navy-400" title={email}>
            Signed in as {email}
          </p>
          <form action={signOut} className="mt-2 px-3">
            <button type="submit" className={cx(button.base, "w-full bg-navy-800 text-white hover:bg-navy-700")}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
