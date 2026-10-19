"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/actions/auth";
import { button, cx, inputClass, Notice } from "./ui";

export default function LoginForm({ next = "", disabled = false }) {
  const [state, action, pending] = useActionState(signIn, { error: "", email: "" });

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-navy-900">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          disabled={disabled}
          className={cx(inputClass, "mt-1")}
        />
      </div>
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-navy-900">
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={disabled}
          className={cx(inputClass, "mt-1")}
        />
      </div>
      <button type="submit" disabled={pending || disabled} className={cx(button.base, button.primary, "w-full py-2.5")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
