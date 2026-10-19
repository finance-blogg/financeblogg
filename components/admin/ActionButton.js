"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFlash } from "./Flash";
import { button, cx } from "./ui";

/**
 * Runs a Server Action with optional confirmation, reports the result in the
 * dashboard notification area, then refreshes the page. The server re-checks
 * authorisation; this only handles the interaction.
 */
export default function ActionButton({
  action,
  payload,
  label,
  pendingLabel = "Working…",
  confirmText = "",
  variant = "secondary",
  size = "small",
  className = "",
}) {
  const router = useRouter();
  const flash = useFlash();
  const [pending, startTransition] = useTransition();

  function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      try {
        const response = await action(payload);
        flash(response?.ok ? "success" : "error", response?.ok ? response.message : response?.error || "The action failed.");
        if (response?.ok) router.refresh();
      } catch {
        flash("error", "Something went wrong. Check your connection and try again.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={cx(button.base, button[variant], size === "small" && button.small, className)}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
