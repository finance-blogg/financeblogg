import AuthorManager from "@/components/admin/AuthorManager";
import { AdminPageHeader, Card } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getEditorOptions } from "@/lib/cms/admin-data";
import { sessionMaxAgeSeconds } from "@/lib/auth/session-policy";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { allMdxArticleRecords, mdxArticlesEnabled } from "@/lib/mdx-source";
import { adsenseClient } from "@/lib/ads";
import { siteConfig } from "@/lib/site";

export const metadata = { title: "Settings" };

function Check({ ok, label, detail }) {
  return (
    <li className="flex gap-3 py-2">
      <span aria-hidden="true" className={ok ? "text-leaf-600" : "text-amber-700"}>
        {ok ? "✓" : "!"}
      </span>
      <span>
        <span className="font-medium text-navy-900">{label}</span>
        <span className="sr-only">{ok ? " (configured)" : " (needs attention)"}</span>
        {detail && <span className="block text-xs text-navy-600">{detail}</span>}
      </span>
    </li>
  );
}

export default async function SettingsPage() {
  const { supabase, user } = await requireAdmin();
  const [{ authors }, imported] = await Promise.all([getEditorOptions(supabase), supabase.rpc("mdx_import_slugs")]);
  const importedCount = (imported.data || []).length;
  const cronSecret = Boolean(process.env.CRON_SECRET);
  const serviceRole = isServiceRoleConfigured();

  return (
    <>
      <AdminPageHeader title="Settings" description="Configuration status and author profiles. Secrets are never shown here; only whether they are set." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Account">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-navy-500">Signed in as</dt>
              <dd className="font-medium text-navy-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-navy-500">Session limit</dt>
              <dd className="text-navy-900">You are signed out {sessionMaxAgeSeconds() / 3600} hours after signing in (ADMIN_SESSION_MAX_HOURS).</dd>
            </div>
            <div>
              <dt className="text-navy-500">Password and administrators</dt>
              <dd className="text-navy-900">Change passwords and add or remove administrators in the Supabase dashboard (see README, “Administrator accounts”).</dd>
            </div>
          </dl>
        </Card>

        <Card title="Configuration">
          <ul className="divide-y divide-navy-50 text-sm">
            <Check ok={isSupabaseConfigured()} label="Supabase connection" detail="NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" />
            <Check
              ok={serviceRole}
              label="Server secret key"
              detail={serviceRole ? "Used for login rate limiting and scheduled publishing." : "SUPABASE_SECRET_KEY is missing: login limits fall back to per-server memory and scheduled publishing cannot run."}
            />
            <Check
              ok={cronSecret && serviceRole}
              label="Scheduled publishing job"
              detail={
                cronSecret
                  ? "CRON_SECRET is set. vercel.json runs the job once a day (Hobby plan limit); see README for more frequent options."
                  : "CRON_SECRET is missing, so /api/cron/publish-scheduled rejects every request. Scheduled articles must be published manually from the dashboard."
              }
            />
            <Check ok={/^https:\/\//.test(siteConfig.url)} label="Site URL" detail={siteConfig.url} />
            <Check ok={Boolean(adsenseClient)} label="Google AdSense" detail={adsenseClient ? "Configured. Ads never load on dashboard pages." : "Not configured."} />
            <Check
              ok
              label="MDX article files"
              detail={`${allMdxArticleRecords.length} file(s) in content/articles, ${importedCount} imported into the database. File articles are ${mdxArticlesEnabled ? "served" : "switched off (CMS_MDX_ARTICLES=off)"}.`}
            />
          </ul>
        </Card>
      </div>

      <Card title="Authors" description="Articles must be credited to an author listed here. Author pages are public." className="mt-6">
        <AuthorManager authors={authors} />
      </Card>
    </>
  );
}
