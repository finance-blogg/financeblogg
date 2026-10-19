"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMedia, replaceMedia, updateMediaAlt } from "@/app/admin/actions/media";
import MediaUploadForm, { ACCEPTED_TYPES, precheckFile } from "./MediaUploadForm";
import { useFlash } from "./Flash";
import { button, cx, formatDateTime, inputClass, Notice } from "./ui";

function MediaItem({ item }) {
  const router = useRouter();
  const flash = useFlash();
  const [alt, setAlt] = useState(item.alt_text);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  function run(fn) {
    setResult(null);
    startTransition(async () => {
      try {
        const response = await fn();
        if (response.ok) {
          flash("success", response.message);
          router.refresh();
        } else {
          setResult(response);
        }
      } catch {
        setResult({ ok: false, error: "Something went wrong. Try again." });
      }
    });
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(`![${alt || "Describe the image"}](${item.public_url})`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setResult({ ok: false, error: "Copy failed. Select and copy the URL instead." });
    }
  }

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-navy-100 bg-white shadow-sm">
      <a href={item.public_url} target="_blank" rel="noopener noreferrer" className="block bg-navy-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.public_url} alt={item.alt_text || ""} loading="lazy" className="aspect-[1200/630] w-full object-cover" />
      </a>
      <div className="flex flex-1 flex-col gap-3 p-3 text-sm">
        <p className="text-xs text-navy-500">
          {item.width} × {item.height} · {(item.size_bytes / 1024).toFixed(0)} KB · {item.mime_type.replace("image/", "").toUpperCase()}
          <br />
          {formatDateTime(item.created_at)}
        </p>
        <div>
          <label htmlFor={`alt-${item.id}`} className="block text-xs font-medium text-navy-900">
            Alt text
          </label>
          <div className="mt-1 flex gap-2">
            <input id={`alt-${item.id}`} value={alt} maxLength={300} onChange={(e) => setAlt(e.target.value)} className={cx(inputClass, "py-1 text-sm")} />
            <button type="button" disabled={pending || alt === item.alt_text} onClick={() => run(() => updateMediaAlt({ id: item.id, alt }))} className={cx(button.base, button.small, button.secondary)}>
              Save
            </button>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <button type="button" onClick={copyMarkdown} className={cx(button.base, button.small, button.ghost)}>
            {copied ? "Copied" : "Copy Markdown"}
          </button>
          <label className={cx(button.base, button.small, button.secondary, "cursor-pointer")}>
            Replace
            <input
              type="file"
              accept={ACCEPTED_TYPES}
              className="sr-only"
              disabled={pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const problem = precheckFile(file);
                if (problem) {
                  setResult({ ok: false, error: problem });
                  return;
                }
                if (!window.confirm("Replace this image everywhere it is used? The old file will be deleted.")) return;
                const formData = new FormData();
                formData.set("id", item.id);
                formData.set("file", file);
                run(() => replaceMedia(formData));
              }}
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => window.confirm("Delete this image permanently?") && run(() => deleteMedia({ id: item.id }))}
            className={cx(button.base, button.small, button.danger)}
          >
            Delete
          </button>
        </div>
        {pending && <p className="text-xs text-navy-500">Working…</p>}
        {result && !result.ok && (
          <p role="alert" className="text-xs text-red-700">
            {result.error}
          </p>
        )}
      </div>
    </li>
  );
}

export default function MediaLibrary({ items }) {
  const router = useRouter();
  return (
    <div className="space-y-8">
      <section aria-labelledby="upload-heading" className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
        <h2 id="upload-heading" className="mb-4 text-sm font-semibold tracking-wide text-navy-950 uppercase">
          Upload an image
        </h2>
        <MediaUploadForm onUploaded={() => router.refresh()} />
      </section>
      {items.length === 0 ? (
        <Notice>No images yet.</Notice>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <MediaItem key={`${item.id}-${item.updated_at}`} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
