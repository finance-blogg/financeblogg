"use client";

import Link from "next/link";

export default function AdminError({ error, retry }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="eyebrow">Dashboard error</p>
      <h1 className="mt-3 font-serif text-2xl font-semibold text-navy-950">This page could not be loaded</h1>
      <p className="mt-3 text-sm text-navy-600">
        The database may be unreachable or misconfigured. Try again, and check the Supabase settings described in the README if it keeps happening.
      </p>
      {error?.digest && <p className="mt-2 text-xs text-navy-400">Reference: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" onClick={() => retry()} className="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
          Try again
        </button>
        <Link href="/admin" className="rounded-md px-4 py-2 text-sm font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50">
          Dashboard home
        </Link>
      </div>
    </div>
  );
}
