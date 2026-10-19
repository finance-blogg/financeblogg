"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAuthor, saveAuthor } from "@/app/admin/actions/taxonomy";
import { slugify } from "@/lib/cms/slug";
import { useFlash } from "./Flash";
import { button, cx, Field, inputClass, Notice } from "./ui";

const EMPTY = { slug: "", name: "", role: "", bio: "", expertise: "", credentials: "", links: { website: "", linkedin: "", x: "" }, isOrganization: false };

function toForm(a) {
  return {
    slug: a.slug,
    name: a.name,
    role: a.role,
    bio: a.bio,
    expertise: (a.expertise || []).join("\n"),
    credentials: (a.credentials || []).join("\n"),
    links: { website: a.links?.website || "", linkedin: a.links?.linkedin || "", x: a.links?.x || a.links?.twitter || "" },
    isOrganization: Boolean(a.is_organization),
  };
}

function AuthorForm({ initial, originalSlug, onDone }) {
  const router = useRouter();
  const flash = useFlash();
  const [values, setValues] = useState(initial);
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();
  const errors = result?.errors || {};
  const id = originalSlug || "new";
  const set = (field) => (e) =>
    setValues((v) => ({ ...v, [field]: e.target.value, ...(field === "name" && !originalSlug ? { slug: slugify(e.target.value, 80) } : {}) }));
  const setLink = (key) => (e) => setValues((v) => ({ ...v, links: { ...v.links, [key]: e.target.value } }));

  function submit(event) {
    event.preventDefault();
    startTransition(async () => {
      const response = await saveAuthor({ originalSlug, values });
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
      <Field label="Name" htmlFor={`au-${id}-name`} error={errors.name}>
        <input id={`au-${id}-name`} value={values.name} onChange={set("name")} maxLength={120} required className={inputClass} />
      </Field>
      <Field label="URL slug" htmlFor={`au-${id}-slug`} error={errors.slug} hint={originalSlug ? "Cannot be changed." : `/authors/${values.slug || "…"}`}>
        <input id={`au-${id}-slug`} value={values.slug} onChange={set("slug")} readOnly={Boolean(originalSlug)} className={cx(inputClass, "font-mono text-sm")} />
      </Field>
      <Field label="Role" htmlFor={`au-${id}-role`} error={errors.role}>
        <input id={`au-${id}-role`} value={values.role} onChange={set("role")} maxLength={120} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" checked={values.isOrganization} onChange={(e) => setValues((v) => ({ ...v, isOrganization: e.target.checked }))} className="h-4 w-4 accent-leaf-600" />
        This is a team or organisation, not a person
      </label>
      <Field label="Bio" htmlFor={`au-${id}-bio`} error={errors.bio} className="sm:col-span-2">
        <textarea id={`au-${id}-bio`} value={values.bio} onChange={set("bio")} rows={3} maxLength={2000} className={inputClass} />
      </Field>
      <Field label="Topics covered (one per line)" htmlFor={`au-${id}-exp`} error={errors.expertise}>
        <textarea id={`au-${id}-exp`} value={values.expertise} onChange={set("expertise")} rows={3} className={inputClass} />
      </Field>
      <Field label="Credentials (one per line)" htmlFor={`au-${id}-cred`} error={errors.credentials} hint="Only qualifications this person actually holds, e.g. a SEBI registration number. Leave empty otherwise.">
        <textarea id={`au-${id}-cred`} value={values.credentials} onChange={set("credentials")} rows={3} className={inputClass} />
      </Field>
      {["website", "linkedin", "x"].map((key) => (
        <Field key={key} label={`${key === "x" ? "X / Twitter" : key[0].toUpperCase() + key.slice(1)} URL`} htmlFor={`au-${id}-${key}`} error={errors[`links.${key}`]}>
          <input id={`au-${id}-${key}`} type="url" value={values.links[key]} onChange={setLink(key)} placeholder="https://" className={inputClass} />
        </Field>
      ))}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={cx(button.base, button.primary)}>
          {pending ? "Saving…" : originalSlug ? "Save author" : "Add author"}
        </button>
      </div>
    </form>
  );
}

export default function AuthorManager({ authors }) {
  const router = useRouter();
  const flash = useFlash();
  const [editing, setEditing] = useState(null);
  const [pending, startTransition] = useTransition();

  function remove(slug, name) {
    if (!window.confirm(`Delete the author “${name}”?`)) return;
    startTransition(async () => {
      const response = await deleteAuthor({ slug });
      flash(response.ok ? "success" : "error", response.ok ? response.message : response.error);
      if (response.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-navy-100 rounded-lg border border-navy-100">
        {authors.map((a) => (
          <li key={a.slug} className="p-4">
            {editing === a.slug ? (
              <AuthorForm originalSlug={a.slug} initial={toForm(a)} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-navy-950">{a.name}</p>
                  <p className="text-xs text-navy-500">
                    /authors/{a.slug}
                    {a.role && ` · ${a.role}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setEditing(a.slug)} className={cx(button.base, button.small, button.secondary)}>
                    Edit
                  </button>
                  <button type="button" disabled={pending} onClick={() => remove(a.slug, a.name)} className={cx(button.base, button.small, button.danger)}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-navy-950">Add an author</h3>
        <AuthorForm initial={EMPTY} originalSlug={null} />
      </div>
    </div>
  );
}
