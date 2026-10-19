"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { submitContact } from "@/app/(site)/contact/actions";
import { CONTACT_LIMITS, CONTACT_SUBJECTS } from "@/lib/contact";

const initialState = { status: "idle", message: "", errors: {}, values: {} };

const inputClass =
  "mt-1 block w-full rounded-md border bg-white px-3 py-2.5 text-base text-navy-900 focus:outline-none focus:ring-2 focus:ring-leaf-100";

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-700">
      {message}
    </p>
  );
}

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initialState);
  const startedAtRef = useRef(null);

  useEffect(() => {
    if (startedAtRef.current) startedAtRef.current.value = String(Date.now());
  }, [state.status]);

  const e = state.errors || {};
  const v = state.values || {};
  const border = (field) => (e[field] ? "border-red-400 focus:border-red-500" : "border-navy-200 focus:border-leaf-600");

  return (
    <form action={formAction} noValidate className="space-y-5" aria-describedby="contact-status">
      <div
        id="contact-status"
        role="status"
        aria-live="polite"
        className={
          state.status === "success"
            ? "rounded-md border border-leaf-200 bg-leaf-50 p-4 text-leaf-800"
            : state.status === "error"
              ? "rounded-md border border-red-200 bg-red-50 p-4 text-red-800"
              : "sr-only"
        }
      >
        {state.message}
      </div>

      <div>
        <label htmlFor="name" className="text-sm font-medium text-navy-900">Your name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={CONTACT_LIMITS.nameMax}
          autoComplete="name"
          defaultValue={v.name}
          key={`name-${state.status}`}
          aria-invalid={Boolean(e.name)}
          aria-describedby={e.name ? "name-error" : undefined}
          className={`${inputClass} ${border("name")}`}
        />
        <FieldError id="name-error" message={e.name} />
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium text-navy-900">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={CONTACT_LIMITS.emailMax}
          autoComplete="email"
          defaultValue={v.email}
          key={`email-${state.status}`}
          aria-invalid={Boolean(e.email)}
          aria-describedby={e.email ? "email-error" : undefined}
          className={`${inputClass} ${border("email")}`}
        />
        <FieldError id="email-error" message={e.email} />
      </div>

      <div>
        <label htmlFor="subject" className="text-sm font-medium text-navy-900">Topic</label>
        <select
          id="subject"
          name="subject"
          required
          defaultValue={v.subject || ""}
          key={`subject-${state.status}`}
          aria-invalid={Boolean(e.subject)}
          aria-describedby={e.subject ? "subject-error" : undefined}
          className={`${inputClass} ${border("subject")}`}
        >
          <option value="" disabled>
            Choose a topic
          </option>
          {CONTACT_SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <FieldError id="subject-error" message={e.subject} />
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium text-navy-900">Message</label>
        <textarea
          id="message"
          name="message"
          rows={7}
          required
          minLength={CONTACT_LIMITS.messageMin}
          maxLength={CONTACT_LIMITS.messageMax}
          defaultValue={v.message}
          key={`message-${state.status}`}
          aria-invalid={Boolean(e.message)}
          aria-describedby={`message-hint${e.message ? " message-error" : ""}`}
          className={`${inputClass} ${border("message")}`}
        />
        <p id="message-hint" className="mt-1 text-xs text-navy-500">
          Please do not include account numbers, PAN, Aadhaar, passwords, OTPs or other sensitive
          financial details. We cannot give personalised financial advice.
        </p>
        <FieldError id="message-error" message={e.message} />
      </div>

      {/* Honeypot: hidden from people, often filled in by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={startedAtRef} type="hidden" name="startedAt" defaultValue="" />

      <div>
        <label className="flex items-start gap-3 text-sm text-navy-700">
          <input
            type="checkbox"
            name="consent"
            value="yes"
            required
            aria-invalid={Boolean(e.consent)}
            aria-describedby={e.consent ? "consent-error" : undefined}
            className="mt-0.5 h-4 w-4 rounded border-navy-300 text-leaf-600 focus:ring-leaf-500"
          />
          <span>
            I have read the{" "}
            <Link href="/privacy-policy" className="text-leaf-700 underline underline-offset-2">
              privacy policy
            </Link>{" "}
            and agree that my name, email and message will be used only to respond to this enquiry.
          </span>
        </label>
        <FieldError id="consent-error" message={e.consent} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center rounded-md bg-navy-900 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
