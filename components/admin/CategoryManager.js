"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory, saveCategory } from "@/app/admin/actions/taxonomy";
import { slugify } from "@/lib/cms/slug";
import { useFlash } from "./Flash";
import { button, cx, Field, inputClass, Notice } from "./ui";

const EMPTY = { slug: "", name: "", shortName: "", description: "", sortOrder: 100 };

function CategoryForm({ initial, originalSlug, onDone }) {
  const router = useRouter();
  const flash = useFlash();
  const [values, setValues] = useState(initial);
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();
  const errors = result?.errors || {};
  const set = (field) => (e) =>
    setValues((v) => ({ ...v, [field]: e.target.value, ...(field === "name" && !originalSlug ? { slug: slugify(e.target.value, 80) } : {}) }));
  const id = originalSlug || "new";

  function submit(event) {
    event.preventDefault();
    startTransition(async () => {
      const response = await saveCategory({ originalSlug, values });
      setResult(response.ok ? null : response);
      if (response.ok) {
        flash("success", response.message);
        router.refresh();
        if (!originalSlug) setValues(EMPTY);
        onDone?.();
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      {result && !result.errors && <Notice tone="error" className="sm:col-span-2">{result.error}</Notice>}
      <Field label="Name" htmlFor={`cat-${id}-name`} error={errors.name}>
        <input id={`cat-${id}-name`} value={values.name} onChange={set("name")} maxLength={80} required className={inputClass} />
      </Field>
      <Field label="URL slug" htmlFor={`cat-${id}-slug`} error={errors.slug} hint={originalSlug ? "Cannot be changed." : `/category/${values.slug || "…"}`}>
        <input id={`cat-${id}-slug`} value={values.slug} onChange={set("slug")} readOnly={Boolean(originalSlug)} maxLength={80} className={cx(inputClass, "font-mono text-sm")} />
      </Field>
      <Field label="Short name (navigation)" htmlFor={`cat-${id}-short`} error={errors.shortName}>
        <input id={`cat-${id}-short`} value={values.shortName} onChange={set("shortName")} maxLength={40} className={inputClass} />
      </Field>
      <Field label="Order" htmlFor={`cat-${id}-order`} hint="Lower numbers appear first.">
        <input id={`cat-${id}-order`} type="number" value={values.sortOrder} onChange={set("sortOrder")} className={inputClass} />
      </Field>
      <Field label="Description" htmlFor={`cat-${id}-desc`} error={errors.description} className="sm:col-span-2" hint="Shown on the category page and used as its meta description.">
        <textarea id={`cat-${id}-desc`} value={values.description} onChange={set("description")} maxLength={300} rows={2} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={cx(button.base, button.primary)}>
          {pending ? "Saving…" : originalSlug ? "Save category" : "Add category"}
        </button>
      </div>
    </form>
  );
}

export default function CategoryManager({ categories, counts }) {
  const router = useRouter();
  const flash = useFlash();
  const [editing, setEditing] = useState(null);
  const [pending, startTransition] = useTransition();

  function remove(slug, name) {
    if (!window.confirm(`Delete the category “${name}”? Its page /category/${slug} will stop working.`)) return;
    startTransition(async () => {
      const response = await deleteCategory({ slug });
      flash(response.ok ? "success" : "error", response.ok ? response.message : response.error);
      if (response.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <ul className="divide-y divide-navy-100 rounded-lg border border-navy-100 bg-white shadow-sm">
        {categories.map((c) => (
          <li key={c.slug} className="p-4">
            {editing === c.slug ? (
              <CategoryForm
                originalSlug={c.slug}
                initial={{ slug: c.slug, name: c.name, shortName: c.short_name, description: c.description, sortOrder: c.sort_order }}
                onDone={() => setEditing(null)}
              />
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-serif text-lg font-semibold text-navy-950">{c.name}</p>
                  <p className="text-xs text-navy-500">
                    /category/{c.slug} · order {c.sort_order} · {counts[c.slug] || 0} database article(s)
                  </p>
                  <p className="mt-1 text-sm text-navy-700">{c.description}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a href={`/category/${c.slug}`} target="_blank" rel="noopener noreferrer" className={cx(button.base, button.small, button.ghost)}>
                    View
                  </a>
                  <button type="button" onClick={() => setEditing(c.slug)} className={cx(button.base, button.small, button.secondary)}>
                    Edit
                  </button>
                  <button type="button" disabled={pending} onClick={() => remove(c.slug, c.name)} className={cx(button.base, button.small, button.danger)}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-navy-950 uppercase">Add a category</h2>
        <CategoryForm initial={EMPTY} originalSlug={null} />
      </section>
    </div>
  );
}
