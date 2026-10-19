"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listMediaItems } from "@/app/admin/actions/media";
import MediaUploadForm from "./MediaUploadForm";
import { button, cx, Notice } from "./ui";

export default function MediaPicker({ open, onClose, onSelect }) {
  const dialogRef = useRef(null);
  const [state, setState] = useState({ items: [], page: 1, totalPages: 1, loading: false, error: "" });

  const load = useCallback(async (page) => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const result = await listMediaItems({ page });
      if (!result.ok) throw new Error(result.error);
      setState({ items: result.items, page, totalPages: result.totalPages, loading: false, error: "" });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error: error.message || "The media library could not be loaded." }));
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      load(1);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, load]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="media-picker-title"
      className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-xl p-0 shadow-xl backdrop:bg-navy-950/50"
    >
      <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
        <h2 id="media-picker-title" className="font-serif text-xl font-semibold text-navy-950">
          Choose an image
        </h2>
        <button type="button" onClick={onClose} className={cx(button.base, button.ghost, button.small)}>
          Close
        </button>
      </div>
      <div className="max-h-[75vh] space-y-6 overflow-y-auto px-5 py-5">
        <section aria-label="Upload a new image" className="rounded-lg bg-navy-50 p-4">
          <MediaUploadForm
            onUploaded={(item) => {
              onSelect(item);
              onClose();
            }}
          />
        </section>

        <section aria-label="Media library">
          {state.error && <Notice tone="error">{state.error}</Notice>}
          {state.loading && <p className="text-sm text-navy-500">Loading images…</p>}
          {!state.loading && !state.error && state.items.length === 0 && <p className="text-sm text-navy-600">No images uploaded yet.</p>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {state.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="group block w-full overflow-hidden rounded-md text-left ring-1 ring-navy-100 hover:ring-2 hover:ring-leaf-600 focus-visible:ring-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.public_url} alt={item.alt_text || ""} loading="lazy" className="aspect-[1200/630] w-full bg-navy-50 object-cover" />
                  <span className="block truncate px-2 py-1.5 text-xs text-navy-700">{item.alt_text || item.original_filename || "No alt text"}</span>
                </button>
              </li>
            ))}
          </ul>
          {state.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button type="button" disabled={state.page <= 1} onClick={() => load(state.page - 1)} className={cx(button.base, button.secondary, button.small)}>
                ← Newer
              </button>
              <span className="text-navy-600">
                Page {state.page} of {state.totalPages}
              </span>
              <button type="button" disabled={state.page >= state.totalPages} onClick={() => load(state.page + 1)} className={cx(button.base, button.secondary, button.small)}>
                Older →
              </button>
            </div>
          )}
        </section>
      </div>
    </dialog>
  );
}
