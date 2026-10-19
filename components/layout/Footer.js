import Link from "next/link";
import { cacheLife } from "next/cache";
import { LogoMark } from "./Logo";
import { legalNav } from "./nav-links";
import { getCategories } from "@/lib/content";
import { siteConfig } from "@/lib/site";

async function CopyrightYear() {
  "use cache";
  cacheLife("weeks");
  return <>{new Date().getFullYear()}</>;
}

export default async function Footer() {
  const categories = await getCategories();
  return (
    <footer className="mt-20 border-t border-navy-100 bg-navy-950 text-navy-200">
      <div className="container-page grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-serif text-xl font-semibold text-white">{siteConfig.name}</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-300">{siteConfig.tagline}.</p>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-navy-400">
            All content is for general education only and is not financial, tax, legal or investment
            advice. Rules, rates and products change; verify with official sources or a qualified,
            registered professional before acting.{" "}
            <Link href="/disclaimer" className="underline underline-offset-2 hover:text-white">
              Read the full disclaimer
            </Link>
            .
          </p>
        </div>

        <nav aria-label="Footer topics" className="md:col-span-3">
          <h2 className="text-sm font-semibold text-white">Topics</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer publication" className="md:col-span-2">
          <h2 className="text-sm font-semibold text-white">Publication</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            <li><Link href="/about" className="hover:text-white">About Us</Link></li>
            <li><Link href="/blog" className="hover:text-white">All Articles</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
            <li><a href="/rss.xml" className="hover:text-white">RSS Feed</a></li>
          </ul>
        </nav>

        <nav aria-label="Footer legal" className="md:col-span-3">
          <h2 className="text-sm font-semibold text-white">Policies</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {siteConfig.contactEmail && (
            <p className="mt-6 text-sm">
              Email:{" "}
              <a href={`mailto:${siteConfig.contactEmail}`} className="underline underline-offset-2 hover:text-white">
                {siteConfig.contactEmail}
              </a>
            </p>
          )}
        </nav>
      </div>
      <div className="border-t border-navy-800">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear /> {siteConfig.name}. All rights reserved.
          </p>
          <p>Educational content for readers in India. Not personalised financial advice.</p>
        </div>
      </div>
    </footer>
  );
}
