import Link from "next/link";
import MediaLibrary from "@/components/admin/MediaLibrary";
import { AdminPageHeader, button, cx } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { listMedia } from "@/lib/cms/admin-data";

export const metadata = { title: "Media" };

export default async function MediaPage({ searchParams }) {
  const { supabase } = await requireAdmin();
  const raw = Number.parseInt((await searchParams).page, 10);
  const page = Number.isFinite(raw) && raw > 0 ? raw : 1;
  const { items, totalPages } = await listMedia(supabase, { page });

  return (
    <>
      <AdminPageHeader
        title="Media library"
        description="Images are stored in Supabase Storage under random file names. Files are publicly reachable by URL once uploaded, so do not upload anything private."
      />
      <MediaLibrary items={items} />
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`/admin/media?page=${page - 1}`} className={cx(button.base, button.secondary)}>
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-navy-600">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`/admin/media?page=${page + 1}`} className={cx(button.base, button.secondary)}>
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
