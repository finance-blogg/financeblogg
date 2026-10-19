"use client";

import { useRef, useState, useTransition } from "react";
import { uploadMedia } from "@/app/admin/actions/media";
import { button, cx, inputClass, Notice } from "./ui";

export const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif,image/avif";
export const MAX_MB = 4;

/** Quick checks for instant feedback; the server validates the real file contents. */
export function precheckFile(file) {
  if (!file) return "Choose an image file.";
  if (file.size > MAX_MB * 1024 * 1024) return `The image is larger than ${MAX_MB} MB. Resize or compress it first.`;
  if (!ACCEPTED_TYPES.split(",").includes(file.type)) return "Only JPEG, PNG, WebP, GIF or AVIF images can be uploaded.";
  return "";
}

export default function MediaUploadForm({ onUploaded }) {
  const formRef = useRef(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function submit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const problem = precheckFile(formData.get("file")?.size ? formData.get("file") : null);
    setMessage("");
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const result = await uploadMedia(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        formRef.current?.reset();
        setMessage(result.message);
        onUploaded?.(result.item);
      } catch {
        setError("The upload failed. Check your connection and the file size, then try again.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="media-file" className="block text-sm font-medium text-navy-900">
            Image file
          </label>
          <input id="media-file" name="file" type="file" accept={ACCEPTED_TYPES} required className="mt-1 block w-full text-sm text-navy-700 file:mr-3 file:rounded-md file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-900" />
        </div>
        <div>
          <label htmlFor="media-alt" className="block text-sm font-medium text-navy-900">
            Alt text
          </label>
          <input id="media-alt" name="alt" type="text" maxLength={300} placeholder="Describe what the image shows" className={cx(inputClass, "mt-1")} />
        </div>
        <button type="submit" disabled={pending} className={cx(button.base, button.primary)}>
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
      <p className="text-xs text-navy-500">
        JPEG, PNG, WebP, GIF or AVIF, up to {MAX_MB} MB. For featured images use at least 1200 × 630 pixels. Only upload images you own or are licensed to use.
      </p>
    </form>
  );
}
