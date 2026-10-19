"use client";

import Link from "next/link";
import ActionButton from "./ActionButton";
import { changeArticleStatus, deleteArticlePermanently, restoreArticle, trashArticle } from "@/app/admin/actions/articles";
import { button, cx } from "./ui";

const FACT_CHECK_CONFIRM =
  "Publish this article now?\n\nIt will be visible to everyone. Press OK only if figures, interest rates, tax rules and regulations have been checked against current official sources.";

export default function ArticleRowActions({ article }) {
  const link = cx(button.base, button.small, button.secondary);
  if (article.deleted_at) {
    return (
      <div className="flex flex-wrap items-start gap-2">
        <ActionButton action={restoreArticle} payload={{ id: article.id }} label="Restore" />
        <ActionButton
          action={deleteArticlePermanently}
          payload={{ id: article.id }}
          label="Delete permanently"
          variant="danger"
          confirmText={`Permanently delete “${article.title}” and its revision history? This cannot be undone.`}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Link href={`/admin/articles/${article.id}/edit`} className={link}>
        Edit
      </Link>
      <a href={`/admin/preview/article/${article.id}`} target="_blank" rel="noopener noreferrer" className={link}>
        Preview
      </a>
      {article.status === "published" ? (
        <>
          <a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer" className={link}>
            View live
          </a>
          <ActionButton
            action={changeArticleStatus}
            payload={{ id: article.id, intent: "unpublish" }}
            label="Unpublish"
            confirmText={`Unpublish “${article.title}”? It will disappear from the site, search, sitemap and RSS feed.`}
          />
        </>
      ) : (
        <ActionButton
          action={changeArticleStatus}
          payload={{ id: article.id, intent: "publish", factCheckConfirmed: true }}
          label="Publish"
          variant="publish"
          confirmText={FACT_CHECK_CONFIRM}
        />
      )}
      <ActionButton
        action={trashArticle}
        payload={{ id: article.id }}
        label="Delete"
        variant="danger"
        confirmText={`Move “${article.title}” to the trash?${article.status === "published" ? " It will be removed from the public site immediately." : ""} You can restore it later.`}
      />
    </div>
  );
}
