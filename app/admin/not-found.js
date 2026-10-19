import Link from "next/link";

export const metadata = { title: "Not found", robots: { index: false, follow: false } };

export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="eyebrow">Not found</p>
      <h1 className="mt-3 font-serif text-2xl font-semibold text-navy-950">This dashboard page does not exist</h1>
      <p className="mt-3 text-sm text-navy-600">The article may have been deleted permanently, or the link is wrong.</p>
      <Link href="/admin" className="mt-6 inline-block rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
        Dashboard home
      </Link>
    </div>
  );
}
