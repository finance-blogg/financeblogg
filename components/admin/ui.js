/**
 * Small presentational helpers for the dashboard, in the site's navy and
 * green palette. No hooks, so they work in Server and Client Components.
 */

export const button = {
  base: "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
  primary: "bg-navy-900 text-white hover:bg-navy-800",
  publish: "bg-leaf-600 text-white hover:bg-leaf-700",
  secondary: "bg-white text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50",
  danger: "bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50",
  dangerSolid: "bg-red-700 text-white hover:bg-red-800",
  ghost: "text-navy-700 hover:bg-navy-50",
  small: "px-2.5 py-1 text-xs",
};

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export const inputClass =
  "block w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-[0.95rem] text-navy-900 placeholder:text-navy-400 focus:border-leaf-600 focus:outline-none focus:ring-2 focus:ring-leaf-100 disabled:bg-navy-50 read-only:bg-navy-50";

export function AdminPageHeader({ title, description, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-navy-950 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-navy-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, children, className = "", actions }) {
  return (
    <section className={cx("rounded-lg border border-navy-100 bg-white p-5 shadow-sm", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-wide text-navy-950 uppercase">{title}</h2>}
            {description && <p className="mt-1 text-sm text-navy-600">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const tones = {
  info: "border-navy-200 bg-navy-50 text-navy-800",
  success: "border-leaf-200 bg-leaf-50 text-leaf-800",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  error: "border-red-200 bg-red-50 text-red-800",
};

export function Notice({ tone = "info", title, children, className = "", role }) {
  return (
    <div role={role || (tone === "error" ? "alert" : "status")} className={cx("rounded-md border px-4 py-3 text-sm", tones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

const statusStyles = {
  draft: "bg-navy-100 text-navy-800",
  scheduled: "bg-amber-100 text-amber-900",
  published: "bg-leaf-100 text-leaf-800",
  trash: "bg-red-100 text-red-800",
};

export function StatusBadge({ status, deleted = false }) {
  const key = deleted ? "trash" : status;
  const label = deleted ? "In trash" : { draft: "Draft", scheduled: "Scheduled", published: "Published" }[status] || status;
  return <span className={cx("inline-flex rounded px-2 py-0.5 text-xs font-semibold", statusStyles[key])}>{label}</span>;
}

export function Field({ label, htmlFor, hint, error, children, required = false, className = "" }) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-navy-900">
        {label}
        {required && <span className="ml-1 text-xs font-normal text-navy-500">(required to publish)</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-navy-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

const ist = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `${ist.format(date)} IST`;
}
