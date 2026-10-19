import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/layout/Logo";
import LoginForm from "@/components/admin/LoginForm";
import { Notice } from "@/components/admin/ui";
import { getAdminContext } from "@/lib/auth/admin";
import { safeAdminPath } from "@/lib/auth/redirect";
import { siteConfig } from "@/lib/site";

export const metadata = { title: "Sign in" };

const REASONS = {
  expired: { tone: "warning", text: "Your session expired. Sign in again to continue." },
  unauthorized: { tone: "error", text: "That account is not authorised to use the dashboard." },
  "signed-out": { tone: "success", text: "You have signed out." },
};

async function LoginPanel({ searchParams }) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "";
  const next = safeAdminPath(typeof params.next === "string" ? params.next : "");

  const ctx = await getAdminContext();
  if (ctx.status === "ok") redirect(next);
  const configured = ctx.status !== "unconfigured";
  const notice = REASONS[reason];

  return (
    <>
      {!configured && (
        <Notice tone="warning" title="The dashboard is not connected to Supabase yet" className="mb-5">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, run the database migrations and create an
          administrator, as described in the README. The public site keeps working from the MDX files meanwhile.
        </Notice>
      )}
      {notice && configured && (
        <Notice tone={notice.tone} className="mb-5">
          {notice.text}
        </Notice>
      )}
      <LoginForm next={next === "/admin" ? "" : next} disabled={!configured} />
    </>
  );
}

export default function LoginPage({ searchParams }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <LogoMark />
          <span className="font-serif text-xl font-semibold text-navy-950">{siteConfig.name}</span>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="font-serif text-2xl font-semibold text-navy-950">Dashboard sign in</h1>
          <p className="mt-1 mb-6 text-sm text-navy-600">For site administrators only. There is no public sign-up.</p>
          <Suspense fallback={<p className="text-sm text-navy-500">Loading…</p>}>
            <LoginPanel searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
