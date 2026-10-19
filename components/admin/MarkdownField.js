"use client";

import dynamic from "next/dynamic";
import { inputClass } from "./ui";

// The editor measures the DOM, so it renders in the browser only. Until it
// loads, a plain textarea keeps the content editable.
const MarkdownEditorInner = dynamic(() => import("./MarkdownEditorInner"), {
  ssr: false,
  loading: () => <p className="rounded-md border border-navy-200 bg-white p-4 text-sm text-navy-500">Loading editor…</p>,
});

export default function MarkdownField({ id, value, onChange, invalid, describedBy, plain = false }) {
  if (plain) {
    return (
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={24}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`${inputClass} font-mono text-sm`}
      />
    );
  }
  return <MarkdownEditorInner id={id} value={value} onChange={onChange} invalid={invalid} describedBy={describedBy} />;
}
