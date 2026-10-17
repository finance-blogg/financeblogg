const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** Dates are stored as YYYY-MM-DD and treated as Indian Standard Time. */
export function toIsoDate(value) {
  return value ? `${value}T00:00:00+05:30` : null;
}

export function formatDate(value) {
  if (!value) return "";
  return dateFormatter.format(new Date(toIsoDate(value)));
}
