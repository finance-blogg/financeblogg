"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPreview, loadRevision, saveArticle } from "@/app/admin/actions/articles";
import { slugify } from "@/lib/cms/slug";
import { LIMITS, validateArticleInput } from "@/lib/cms/validation";
import MarkdownField from "./MarkdownField";
import MediaPicker from "./MediaPicker";
import { button, Card, cx, Field, formatDateTime, inputClass, Notice, StatusBadge } from "./ui";

const sameValues = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function todayIst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function Counter({ value, ideal, max }) {
  const n = value.length;
  const tone = n > max ? "text-red-700" : ideal && n > ideal ? "text-amber-800" : "text-navy-500";
  return (
    <span className={cx("text-xs", tone)}>
      {n}
      {ideal ? ` / ideally ≤ ${ideal}` : ` / ${max}`}
    </span>
  );
}

const REVISION_LABELS = {
  created: "Created",
  updated: "Edited",
  published: "Published",
  unpublished: "Unpublished",
  scheduled: "Scheduled",
  unscheduled: "Schedule cancelled",
  trashed: "Moved to trash",
  restored: "Restored",
};

export default function ArticleEditor({ initialValues, initialMeta = null, categories, authors, revisions = [], storagePrefix, notice = "" }) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [meta, setMeta] = useState(initialMeta);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialMeta));
  const [scheduleLocal, setScheduleLocal] = useState(initialMeta?.status === "scheduled" ? toLocalInput(initialMeta.publishedAt) : "");
  const [factCheckConfirmed, setFactCheckConfirmed] = useState(false);
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(notice ? { tone: "success", text: notice } : null);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [plainEditor, setPlainEditor] = useState(false);
  const [backupOffer, setBackupOffer] = useState(null);

  const status = meta?.status || "draft";
  const slugLocked = Boolean(meta?.firstPublishedAt);
  const dirty = useMemo(() => !sameValues(values, savedValues), [values, savedValues]);
  const backupKey = `fb-cms-backup:${meta?.id || "new"}`;
  const categorySlugs = useMemo(() => categories.map((c) => c.slug), [categories]);
  const authorSlugs = useMemo(() => authors.map((a) => a.slug), [authors]);

  // Offer to restore work kept in this browser after a crash, expiry or closed tab.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(backupKey);
      if (!raw) return;
      const backup = JSON.parse(raw);
      const newer = !initialMeta?.updatedAt || backup.savedAt > Date.parse(initialMeta.updatedAt);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage once after mount
      if (newer && !sameValues(backup.values, initialValues)) setBackupOffer(backup);
      else window.localStorage.removeItem(backupKey);
    } catch {
      window.localStorage.removeItem(backupKey);
    }
  }, [backupKey, initialMeta, initialValues]);

  // Keep a local copy of unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(backupKey, JSON.stringify({ values, savedAt: Date.now() }));
      } catch {
        // Storage full or disabled; the unsaved-changes warning still applies.
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [values, dirty, backupKey]);

  // Warn before leaving with unsaved changes (reloads, closing the tab, in-app links).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank" || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm("You have unsaved changes. Leave this page without saving?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function update(field, value) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !slugTouched && !slugLocked) next.slug = slugify(value);
      return next;
    });
    if (errors[field]) setErrors(({ [field]: _removed, ...rest }) => rest);
  }

  const bind = (field) => ({
    id: `f-${field}`,
    value: values[field] ?? "",
    onChange: (e) => update(field, e.target.value),
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `f-${field}-error` : undefined,
  });

  function scheduledIso() {
    if (!scheduleLocal) return "";
    const d = new Date(scheduleLocal);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }

  async function submit(intent) {
    if (busy) return;
    if (intent === "publish" && !window.confirm(status === "scheduled" ? "Publish this article now instead of at the scheduled time?" : "Publish this article now? It will be visible to everyone.")) return;
    if (intent === "unpublish" && !window.confirm(status === "published" ? "Unpublish this article? It will be removed from the site, search, sitemap and RSS feed." : "Cancel the schedule and move this article back to drafts?")) return;

    const payloadValues = { ...values, factCheckConfirmed, scheduledFor: scheduledIso() };
    const local = validateArticleInput(payloadValues, {
      intent,
      currentStatus: status,
      categories: categorySlugs,
      authors: authorSlugs,
      storagePrefix,
    });
    if (!local.ok) {
      setErrors(local.errors);
      setWarnings(local.warnings);
      setFeedback({ tone: "error", text: "Please fix the highlighted fields before saving." });
      return;
    }

    const submitted = values;
    setBusy(intent);
    setFeedback(null);
    try {
      const result = await saveArticle({ id: meta?.id || null, expectedUpdatedAt: meta?.updatedAt || null, values: payloadValues, intent });
      if (!result.ok) {
        setErrors(result.errors || {});
        setWarnings(result.warnings || []);
        setFeedback({ tone: "error", text: result.error || "The article could not be saved.", auth: result.auth, conflict: result.conflict });
        return;
      }
      setErrors({});
      setWarnings(result.warnings || []);
      setMeta(result.article);
      setSavedValues(result.values);
      setValues((current) => (sameValues(current, submitted) ? result.values : current));
      setSlugTouched(true);
      if (intent === "publish" || intent === "schedule") setFactCheckConfirmed(false);
      if (result.article.status !== "scheduled") setScheduleLocal("");
      window.localStorage.removeItem(backupKey);
      setFeedback({ tone: "success", text: result.message });
      if (!meta?.id) {
        window.localStorage.removeItem("fb-cms-backup:new");
        router.replace(`/admin/articles/${result.article.id}/edit?saved=1`);
      }
    } catch {
      setFeedback({ tone: "error", text: "The save request failed. Check your connection; your changes are still here and saved in this browser." });
    } finally {
      setBusy(null);
    }
  }

  async function openPreview() {
    const win = window.open("about:blank", "_blank");
    setFeedback(null);
    try {
      const result = await createPreview({ id: meta?.id || null, values, status, publishedAt: meta?.publishedAt || null });
      if (!result.ok) throw new Error(result.error);
      if (win) {
        win.opener = null;
        win.location.href = result.url;
      } else {
        window.location.assign(result.url);
      }
    } catch (error) {
      win?.close();
      setFeedback({ tone: "error", text: error.message || "The preview could not be created." });
    }
  }

  async function restoreRevision(revision) {
    if (dirty && !window.confirm("Replace your unsaved changes with this older version?")) return;
    const result = await loadRevision({ articleId: meta.id, revisionId: revision.id });
    if (!result.ok) {
      setFeedback({ tone: "error", text: result.error });
      return;
    }
    setValues(result.values);
    setFeedback({ tone: "info", text: `Loaded the version from ${formatDateTime(result.createdAt)}. Review it, then save to apply it.` });
  }

  function onKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      submit("save");
    }
  }

  const effectiveTitle = values.seoTitle || values.title || "Article title";
  const effectiveDescription = values.seoDescription || values.excerpt || "The excerpt is used as the meta description unless you write one below.";
  const imageAlt = values.featuredImageAlt;

  return (
    <div onKeyDown={onKeyDown}>
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-navy-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={status} />
            <span className="text-navy-600" aria-live="polite">
              {busy ? "Saving…" : dirty ? "Unsaved changes" : meta?.updatedAt ? `Saved ${formatDateTime(meta.updatedAt)}` : "Not saved yet"}
            </span>
            {status === "scheduled" && meta?.publishedAt && <span className="text-amber-800">Publishes {formatDateTime(meta.publishedAt)}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => submit("save")} disabled={Boolean(busy)} className={cx(button.base, button.secondary)}>
              {status === "published" ? "Update live article" : status === "scheduled" ? "Save changes" : "Save draft"}
            </button>
            <button type="button" onClick={openPreview} disabled={Boolean(busy)} className={cx(button.base, button.secondary)}>
              Preview
            </button>
            {status !== "published" && (
              <button type="button" onClick={() => submit("publish")} disabled={Boolean(busy)} className={cx(button.base, button.publish)}>
                {status === "scheduled" ? "Publish now" : "Publish"}
              </button>
            )}
            {status !== "draft" && (
              <button type="button" onClick={() => submit("unpublish")} disabled={Boolean(busy)} className={cx(button.base, button.danger)}>
                {status === "published" ? "Unpublish" : "Cancel schedule"}
              </button>
            )}
            {status === "published" && meta?.slug && (
              <a href={`/blog/${meta.slug}`} target="_blank" rel="noopener noreferrer" className={cx(button.base, button.ghost)}>
                View live ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {backupOffer && (
        <Notice tone="warning" title="Unsaved changes were found in this browser" className="mb-4">
          <p>They were kept on {formatDateTime(backupOffer.savedAt)} and are newer than the saved version.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={cx(button.base, button.small, button.primary)}
              onClick={() => {
                setValues(backupOffer.values);
                setBackupOffer(null);
              }}
            >
              Restore them
            </button>
            <button
              type="button"
              className={cx(button.base, button.small, button.secondary)}
              onClick={() => {
                window.localStorage.removeItem(backupKey);
                setBackupOffer(null);
              }}
            >
              Discard
            </button>
          </div>
        </Notice>
      )}

      {feedback && (
        <Notice tone={feedback.tone} className="mb-4">
          <p>{feedback.text}</p>
          {feedback.auth && (
            <p className="mt-1">
              <a href={`/admin/login?next=${encodeURIComponent(meta?.id ? `/admin/articles/${meta.id}/edit` : "/admin/articles/new")}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                Sign in again in a new tab
              </a>
              , then come back here and save.
            </p>
          )}
          {feedback.conflict && (
            <button type="button" onClick={() => window.location.reload()} className={cx(button.base, button.small, button.secondary, "mt-2")}>
              Reload (your changes stay in this browser)
            </button>
          )}
        </Notice>
      )}
      {warnings.length > 0 && (
        <Notice tone="warning" title="Worth checking" className="mb-4">
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="space-y-5">
              <Field label="Title" htmlFor="f-title" error={errors.title}>
                <input {...bind("title")} type="text" maxLength={LIMITS.title} className={cx(inputClass, "font-serif text-xl")} placeholder="A clear, specific title" />
              </Field>
              <Field
                label="URL slug"
                htmlFor="f-slug"
                error={errors.slug}
                hint={slugLocked ? "Locked because this article has been published; changing it would break links." : `The article will live at /blog/${values.slug || "…"}`}
              >
                <div className="flex gap-2">
                  <input
                    {...bind("slug")}
                    onChange={(e) => {
                      setSlugTouched(true);
                      update("slug", e.target.value.toLowerCase());
                    }}
                    readOnly={slugLocked}
                    type="text"
                    maxLength={100}
                    className={cx(inputClass, "font-mono text-sm")}
                  />
                  {!slugLocked && (
                    <button type="button" onClick={() => update("slug", slugify(values.title))} className={cx(button.base, button.secondary, "shrink-0")}>
                      From title
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Subtitle" htmlFor="f-subtitle" error={errors.subtitle} hint="Optional. Shown under the title.">
                <input {...bind("subtitle")} type="text" maxLength={LIMITS.subtitle} className={inputClass} />
              </Field>
              <Field label="Excerpt" htmlFor="f-excerpt" error={errors.excerpt} required hint="Shown on article cards and used as the meta description if you leave that empty. Aim for 120–160 characters.">
                <textarea {...bind("excerpt")} rows={3} maxLength={LIMITS.excerpt} className={inputClass} />
                <Counter value={values.excerpt} ideal={160} max={LIMITS.excerpt} />
              </Field>
            </div>
          </Card>

          <Card
            title="Article body"
            description="Markdown. Use ## for sections and ### for sub-sections. Raw HTML is not displayed."
            actions={
              <button type="button" onClick={() => setPlainEditor((v) => !v)} className={cx(button.base, button.small, button.ghost)}>
                {plainEditor ? "Use rich editor" : "Plain text mode"}
              </button>
            }
          >
            {errors.body && <p id="f-body-error" className="mb-2 text-xs font-medium text-red-700">{errors.body}</p>}
            <MarkdownField
              id="f-body"
              value={values.body}
              onChange={(v) => update("body", v)}
              invalid={Boolean(errors.body)}
              describedBy={errors.body ? "f-body-error" : "f-body-help"}
              plain={plainEditor}
            />
            <details id="f-body-help" className="mt-3 text-sm text-navy-700">
              <summary className="cursor-pointer font-medium text-navy-900">Formatting help</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs">
                <li>## Section heading · ### Sub-heading</li>
                <li>**bold** · *italic* · [link text](/blog/another-article) · &gt; quotation</li>
                <li>- bullet · 1. numbered · | table | columns |</li>
                <li>:::key-takeaways … ::: · :::callout{"{"}type=&quot;example&quot; title=&quot;…&quot;{"}"} … ::: (types: note, example, opinion, estimate, warning, verify)</li>
                <li>::ad-break (one or two per article at most)</li>
              </ul>
            </details>
          </Card>

          <Card title="Sources" description="Official and primary sources readers can check. Use full https:// links.">
            <div className="space-y-4">
              {values.sources.map((source, i) => (
                <div key={i} className="grid gap-2 rounded-md border border-navy-100 p-3 sm:grid-cols-2">
                  <Field label="Title" htmlFor={`f-source-${i}-title`} error={errors[`sources.${i}.title`]}>
                    <input id={`f-source-${i}-title`} value={source.title} onChange={(e) => update("sources", values.sources.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)))} className={inputClass} />
                  </Field>
                  <Field label="Publisher" htmlFor={`f-source-${i}-publisher`}>
                    <input id={`f-source-${i}-publisher`} value={source.publisher} onChange={(e) => update("sources", values.sources.map((s, j) => (j === i ? { ...s, publisher: e.target.value } : s)))} className={inputClass} placeholder="e.g. Reserve Bank of India" />
                  </Field>
                  <Field label="URL" htmlFor={`f-source-${i}-url`} error={errors[`sources.${i}.url`]}>
                    <input id={`f-source-${i}-url`} type="url" value={source.url} onChange={(e) => update("sources", values.sources.map((s, j) => (j === i ? { ...s, url: e.target.value } : s)))} className={inputClass} placeholder="https://" />
                  </Field>
                  <Field label="Note" htmlFor={`f-source-${i}-note`}>
                    <input id={`f-source-${i}-note`} value={source.note} onChange={(e) => update("sources", values.sources.map((s, j) => (j === i ? { ...s, note: e.target.value } : s)))} className={inputClass} />
                  </Field>
                  <div className="sm:col-span-2">
                    <button type="button" onClick={() => update("sources", values.sources.filter((_, j) => j !== i))} className={cx(button.base, button.small, button.danger)}>
                      Remove source
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => update("sources", [...values.sources, { title: "", publisher: "", url: "", note: "" }])} className={cx(button.base, button.small, button.secondary)}>
                Add source
              </button>
            </div>
          </Card>

          <Card title="SEO" description="Leave blank to use the title and excerpt.">
            <div className="space-y-5">
              <div className="rounded-md bg-navy-50 p-4" aria-label="Search result preview">
                <p className="truncate text-lg text-[#1a0dab]">{effectiveTitle}</p>
                <p className="truncate text-xs text-leaf-700">/blog/{values.slug || "your-slug"}</p>
                <p className="mt-1 line-clamp-2 text-sm text-navy-700">{effectiveDescription}</p>
              </div>
              <Field label="SEO title" htmlFor="f-seoTitle" error={errors.seoTitle}>
                <input {...bind("seoTitle")} type="text" maxLength={LIMITS.seoTitle} className={inputClass} placeholder={values.title} />
                <Counter value={values.seoTitle || values.title} ideal={LIMITS.seoTitleIdeal} max={LIMITS.seoTitle} />
              </Field>
              <Field label="Meta description" htmlFor="f-seoDescription" error={errors.seoDescription}>
                <textarea {...bind("seoDescription")} rows={3} maxLength={LIMITS.seoDescription} className={inputClass} placeholder={values.excerpt} />
                <Counter value={values.seoDescription || values.excerpt} ideal={LIMITS.metaIdealMax} max={LIMITS.seoDescription} />
              </Field>
              <Field label="Canonical URL override" htmlFor="f-canonicalUrl" error={errors.canonicalUrl} hint="Only if this article was first published on another site. Leave empty otherwise.">
                <input {...bind("canonicalUrl")} type="url" className={inputClass} placeholder="https://" />
              </Field>
            </div>
          </Card>

          <Card title="Private notes" description="Never shown on the public site.">
            <div className="space-y-5">
              <Field label="Fact-check notes" htmlFor="f-reviewNotes" error={errors.reviewNotes} hint="What needs verifying and where (for example: confirm the FY 2026-27 slab rates on incometax.gov.in).">
                <textarea {...bind("reviewNotes")} rows={3} className={inputClass} />
              </Field>
              <Field label="Editorial notes" htmlFor="f-editorialNotes" error={errors.editorialNotes}>
                <textarea {...bind("editorialNotes")} rows={3} className={inputClass} />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="space-y-6" aria-label="Publishing settings">
          <Notice tone="warning" title="Fact-check before publishing" role="note">
            Financial regulations, interest rates and tax rules change often. Check every figure against the current official source
            (RBI, SEBI, IRDAI, Income Tax Department, CBIC) and say which year it applies to.
          </Notice>

          <Card title="Publishing">
            <div className="space-y-4 text-sm">
              {meta?.publishedAt && status !== "scheduled" && (
                <p className="text-navy-700">
                  {meta.firstPublishedAt ? "First published" : "Publication date"}: {formatDateTime(meta.firstPublishedAt || meta.publishedAt)}
                </p>
              )}
              {status !== "published" && (
                <Field label="Schedule for" htmlFor="f-schedule" error={errors.scheduledFor} hint="Uses this device's time zone. Requires the scheduled-publishing job (see Settings).">
                  <div className="flex gap-2">
                    <input id="f-schedule" type="datetime-local" value={scheduleLocal} onChange={(e) => setScheduleLocal(e.target.value)} className={inputClass} />
                  </div>
                  <button type="button" onClick={() => submit("schedule")} disabled={Boolean(busy) || !scheduleLocal} className={cx(button.base, button.secondary, "mt-2 w-full")}>
                    {status === "scheduled" ? "Update schedule" : "Schedule"}
                  </button>
                </Field>
              )}
              <label className={cx("flex gap-2 rounded-md p-2", errors.factCheckConfirmed ? "bg-red-50 ring-1 ring-red-200" : "bg-navy-50")}>
                <input type="checkbox" checked={factCheckConfirmed} onChange={(e) => setFactCheckConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-leaf-600" />
                <span className="text-xs text-navy-800">
                  I have checked figures, interest rates, tax rules and regulations in this article against current official sources.
                </span>
              </label>
              {errors.factCheckConfirmed && <p className="text-xs font-medium text-red-700">{errors.factCheckConfirmed}</p>}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={values.featured} onChange={(e) => update("featured", e.target.checked)} className="h-4 w-4 accent-leaf-600" />
                <span>Feature on the homepage</span>
              </label>
              <Field label="Last substantive update" htmlFor="f-updatedOn" error={errors.updatedOn} hint="Shown publicly as “Updated”. Set only after a real content change.">
                <div className="flex gap-2">
                  <input {...bind("updatedOn")} type="date" className={inputClass} />
                  <button type="button" onClick={() => update("updatedOn", todayIst())} className={cx(button.base, button.small, button.secondary)}>
                    Today
                  </button>
                </div>
              </Field>
            </div>
          </Card>

          <Card title="Featured image">
            <div className="space-y-3">
              {values.featuredImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={values.featuredImageUrl} alt={imageAlt || "Selected featured image"} className="aspect-[1200/630] w-full rounded-md bg-navy-50 object-cover ring-1 ring-navy-100" />
              ) : (
                <p className="rounded-md border border-dashed border-navy-200 p-4 text-center text-sm text-navy-500">No image selected. A branded placeholder is shown instead.</p>
              )}
              {errors.featuredImageUrl && <p className="text-xs font-medium text-red-700">{errors.featuredImageUrl}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPickerOpen(true)} className={cx(button.base, button.small, button.secondary)}>
                  {values.featuredImageUrl ? "Change image" : "Choose or upload"}
                </button>
                {values.featuredImageUrl && (
                  <button
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, featuredImageUrl: "", featuredImageWidth: null, featuredImageHeight: null }))}
                    className={cx(button.base, button.small, button.danger)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <Field label="Alt text" htmlFor="f-featuredImageAlt" error={errors.featuredImageAlt} hint="Describe the image for people using screen readers.">
                <input {...bind("featuredImageAlt")} type="text" maxLength={LIMITS.imageAlt} className={inputClass} />
              </Field>
              <Field label="Credit" htmlFor="f-featuredImageCredit" error={errors.featuredImageCredit}>
                <input {...bind("featuredImageCredit")} type="text" maxLength={LIMITS.imageCredit} className={inputClass} placeholder="Optional, e.g. Photo: Name / Licence" />
              </Field>
            </div>
          </Card>

          <Card title="Category, author and tags">
            <div className="space-y-4">
              <Field label="Category" htmlFor="f-categorySlug" error={errors.categorySlug} required>
                <select {...bind("categorySlug")} className={inputClass}>
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Author" htmlFor="f-authorSlug" error={errors.authorSlug} required>
                <select {...bind("authorSlug")} className={inputClass}>
                  <option value="">Choose an author</option>
                  {authors.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tags" htmlFor="f-tags" error={errors.tags} hint="Comma-separated, for example: UPI, fraud prevention">
                <input {...bind("tags")} type="text" className={inputClass} />
              </Field>
            </div>
          </Card>

          <Card title="Editorial review" description="Shown publicly as “Editorially reviewed” only when verified.">
            <div className="space-y-4">
              <Field label="Fact-check status" htmlFor="f-factCheckStatus">
                <select {...bind("factCheckStatus")} className={inputClass}>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified by a human editor</option>
                </select>
              </Field>
              <Field label="Reviewed by" htmlFor="f-reviewedBy" error={errors.reviewedBy} hint="Only a real person or team who actually reviewed it.">
                <select {...bind("reviewedBy")} className={inputClass}>
                  <option value="">Nobody named</option>
                  {authors.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Reviewed on" htmlFor="f-reviewedOn" error={errors.reviewedOn}>
                <input {...bind("reviewedOn")} type="date" className={inputClass} />
              </Field>
            </div>
          </Card>

          {meta?.id && revisions.length > 0 && (
            <Card title="History" description="Load an earlier version into the editor, then save to apply it.">
              <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
                {revisions.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="font-medium text-navy-900">{REVISION_LABELS[r.action] || r.action}</span>
                      <span className="block text-xs text-navy-500">{formatDateTime(r.created_at)}</span>
                    </span>
                    <button type="button" onClick={() => restoreRevision(r)} className={cx(button.base, button.small, button.ghost)}>
                      Load
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(item) =>
          setValues((v) => ({
            ...v,
            featuredImageUrl: item.public_url,
            featuredImageWidth: item.width,
            featuredImageHeight: item.height,
            featuredImageAlt: v.featuredImageAlt || item.alt_text || "",
          }))
        }
      />
    </div>
  );
}
