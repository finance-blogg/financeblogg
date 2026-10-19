import { Suspense } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { FlashProvider } from "@/components/admin/Flash";
import { requireAdmin } from "@/lib/auth/admin";

async function AdminShell({ children }) {
  const { user } = await requireAdmin();
  return (
    <FlashProvider>
      <div className="flex flex-1 flex-col lg:flex-row">
        <AdminNav email={user.email} />
        <main id="main-content" className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </FlashProvider>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <Suspense fallback={<p className="p-10 text-sm text-navy-500">Checking your session…</p>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
