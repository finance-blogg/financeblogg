import { Suspense } from "react";
import { connection } from "next/server";
import { siteConfig } from "@/lib/site";

export const metadata = {
  title: { default: `Dashboard | ${siteConfig.name}`, template: `%s | ${siteConfig.name} dashboard` },
  description: "Private content dashboard.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  alternates: {},
  openGraph: null,
};

// Every dashboard page reads the session, so navigations wait for the server.
export const instant = false;

/** Marks dashboard routes as rendered per request, so their metadata is not expected in the static shell. */
async function RequestTimeMarker() {
  await connection();
  return null;
}

/** Private area: no public header, footer, AdSense or analytics. */
export default function AdminRootLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-navy-50/60">
      {children}
      <Suspense>
        <RequestTimeMarker />
      </Suspense>
    </div>
  );
}
