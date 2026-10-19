import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ArticleView from "@/components/article/ArticleView";
import { requireAdmin } from "@/lib/auth/admin";
import { getArticleForEdit, UUID_PATTERN } from "@/lib/cms/admin-data";
import { mapDbArticle } from "@/lib/cms/mappers";
import { editorDataToArticle } from "@/lib/cms/editor-mapping";
import { formatDateTime } from "@/components/admin/ui";

export const metadata = { title: "Preview", robots: { index: false, follow: false, nocache: true } };

/**
 * Private preview, rendered with the public article template but without
 * ads, share links or structured data.
 *   /admin/preview/article/<article id>   the saved version
 *   /admin/preview/draft/<preview id>     unsaved editor content (expires after 2 hours)
 */
async function loadPreview(kind, id) {
  const { supabase } = await requireAdmin();
  if (!UUID_PATTERN.test(String(id))) return null;

  if (kind === "article") {
    const row = await getArticleForEdit(supabase, id);
    if (!row) return null;
    return { article: mapDbArticle(row), articleId: row.id, label: "Saved version", supabase };
  }
  if (kind === "draft") {
    const { data, error } = await supabase.from("article_previews").select("article_id,payload,expires_at").eq("id", id).maybeSingle();
    if (error || !data) return null;
    const { values, status, publishedAt } = data.payload;
    return {
      article: editorDataToArticle(values, { status, publishedAt }),
      articleId: data.article_id,
      label: `Unsaved changes · link expires ${formatDateTime(data.expires_at)}`,
      supabase,
    };
  }
  return null;
}

async function PreviewContent({ params }) {
  const { kind, id } = await params;
  const preview = await loadPreview(kind, id);
  if (!preview) notFound();
  const { article, articleId, label, supabase } = preview;

  const slugs = [article.author, article.review.reviewedBy].filter(Boolean);
  const [authors, category] = await Promise.all([
    slugs.length ? supabase.from("authors").select("slug,name,role,bio").in("slug", slugs) : { data: [] },
    article.category ? supabase.from("categories").select("slug,name").eq("slug", article.category).maybeSingle() : { data: null },
  ]);
  const authorBySlug = new Map((authors.data || []).map((a) => [a.slug, a]));

  return (
    <>
      <div className="sticky top-0 z-[60] bg-amber-400 text-amber-950">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
          <p>
            <strong>Private preview</strong> · {label} · Status: {article.status}. Not visible to the public; ads are hidden.
          </p>
          {articleId && (
            <Link href={`/admin/articles/${articleId}/edit`} className="font-semibold underline">
              Back to the editor
            </Link>
          )}
        </div>
      </div>
      <Header />
      <main id="main-content" className="flex-1 bg-white">
        <ArticleView
          article={article}
          author={authorBySlug.get(article.author) || null}
          reviewer={authorBySlug.get(article.review.reviewedBy) || null}
          category={category.data || null}
          isPreview
        />
      </main>
      <Footer />
    </>
  );
}

export default function PreviewPage({ params }) {
  return (
    <Suspense fallback={<p className="p-10 text-sm text-navy-500">Loading preview…</p>}>
      <PreviewContent params={params} />
    </Suspense>
  );
}
