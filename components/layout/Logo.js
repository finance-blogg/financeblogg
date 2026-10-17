import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function LogoMark({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="9" fill="#142039" />
      <path d="M10 13h14M10 20h10M10 27h7" stroke="#c6d2e6" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 29l5-6 3.5 3L33 15" fill="none" stroke="#2f9e5f" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ className = "" }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 ${className}`} aria-label={`${siteConfig.name} home`}>
      <LogoMark />
      <span className="font-serif text-xl font-semibold tracking-tight text-navy-950 sm:text-[1.4rem]">
        {siteConfig.name}
      </span>
    </Link>
  );
}
