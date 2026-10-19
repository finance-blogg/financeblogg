"use client";

import Link from "next/link";

export default function Error({ retry }) {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-navy-950">This page could not be loaded</h1>
        <p className="mt-4 text-navy-600">
          A temporary problem stopped this page from loading. Please try again. If it keeps happening,
          let us know through the contact page.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-md bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Try again
          </button>
          <Link href="/" className="rounded-md px-5 py-2.5 text-sm font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50">
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
