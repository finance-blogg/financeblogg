import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AdSenseScript from "@/components/ads/AdSenseScript";
import SearchForm from "@/components/search/SearchForm";
import { getCategories } from "@/lib/content";
import { adsenseClient } from "@/lib/ads";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
  ...(adsenseClient ? { other: { "google-adsense-account": adsenseClient } } : {}),
};

// Rendered outside app/(site)/layout.js, so it brings its own header, footer and
// AdSense tag. Missing /admin pages use app/admin/not-found.js instead.
export default async function NotFound() {
  const categories = await getCategories();
  return (
    <>
      <AdSenseScript />
      <Header />
      <main id="main-content" className="flex-1">
        <div className="container-page py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Error 404</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold text-navy-950">We could not find that page</h1>
            <p className="mt-4 text-lg text-navy-600">
              The link may be broken, or the article may have moved. Try searching, or start from one of
              our topics.
            </p>
            <div className="mx-auto mt-8 max-w-lg">
              <SearchForm id="notfound-search" size="lg" />
            </div>
            <ul className="mt-10 flex flex-wrap justify-center gap-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="rounded-full bg-navy-50 px-3 py-1.5 text-sm text-navy-700 hover:bg-navy-100">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/" className="mt-10 inline-block font-medium text-leaf-700 hover:underline">
              ← Back to the homepage
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
