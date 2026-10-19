"use server";

import { headers } from "next/headers";
import { CONTACT_LIMITS, CONTACT_SUBJECTS } from "@/lib/contact";
import { isContactDeliveryConfigured } from "@/lib/contact-delivery";
import { siteConfig } from "@/lib/site";

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const MIN_FILL_MS = 3000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };

// Best-effort, per-instance limiter. On serverless platforms each instance has
// its own memory, so pair this with platform-level protection for heavy abuse.
const submissions = new Map();

function rateLimited(key) {
  const now = Date.now();
  const recent = (submissions.get(key) || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    submissions.set(key, recent);
    return true;
  }
  recent.push(now);
  submissions.set(key, recent);
  if (submissions.size > 5000) submissions.clear();
  return false;
}

function singleLine(value, max) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, max);
}

export async function submitContact(prevState, formData) {
  const values = {
    name: singleLine(formData.get("name"), CONTACT_LIMITS.nameMax),
    email: singleLine(formData.get("email"), CONTACT_LIMITS.emailMax),
    subject: singleLine(formData.get("subject"), 60),
    message: String(formData.get("message") || "").trim().slice(0, CONTACT_LIMITS.messageMax + 1),
  };

  // Spam checks: a hidden honeypot field and a minimum time to fill the form.
  const honeypot = String(formData.get("company") || "");
  const startedAt = Number(formData.get("startedAt"));
  const elapsed = Date.now() - startedAt;
  if (honeypot || !Number.isFinite(startedAt) || elapsed < MIN_FILL_MS || elapsed > MAX_FORM_AGE_MS) {
    return {
      status: "error",
      message: "We could not accept this submission. Please reload the page and try again, or email us directly.",
      errors: {},
      values,
    };
  }

  const errors = {};
  if (values.name.length < 2) errors.name = "Please enter your name.";
  if (!EMAIL_PATTERN.test(values.email)) errors.email = "Please enter a valid email address.";
  if (!CONTACT_SUBJECTS.includes(values.subject)) errors.subject = "Please choose a topic.";
  if (values.message.length < CONTACT_LIMITS.messageMin) {
    errors.message = `Please write at least ${CONTACT_LIMITS.messageMin} characters.`;
  } else if (values.message.length > CONTACT_LIMITS.messageMax) {
    errors.message = `Please keep your message under ${CONTACT_LIMITS.messageMax} characters.`;
  } else if ((values.message.match(/https?:\/\//gi) || []).length > 3) {
    errors.message = "Please include no more than three links.";
  }
  if (formData.get("consent") !== "yes") {
    errors.consent = "Please confirm you have read the privacy policy.";
  }
  if (Object.keys(errors).length) {
    return { status: "error", message: "Please fix the highlighted fields.", errors, values };
  }

  const headerList = await headers();
  const ip = (headerList.get("x-forwarded-for") || "").split(",")[0].trim() || headerList.get("x-real-ip") || "unknown";
  if (rateLimited(ip)) {
    return {
      status: "error",
      message: "Too many messages from this connection. Please wait a few minutes and try again.",
      errors: {},
      values,
    };
  }

  if (!isContactDeliveryConfigured()) {
    return {
      status: "error",
      message: siteConfig.contactEmail
        ? `The contact form is not connected to an email service yet. Please email ${siteConfig.contactEmail} instead.`
        : "The contact form is not connected to an email service yet.",
      errors: {},
      values,
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL,
        to: [process.env.CONTACT_TO_EMAIL],
        reply_to: values.email,
        subject: `[${siteConfig.name}] ${values.subject} from ${values.name}`,
        text: `Name: ${values.name}\nEmail: ${values.email}\nTopic: ${values.subject}\n\n${values.message}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Email provider responded with ${response.status}`);
  } catch (error) {
    console.error("[contact] delivery failed:", error.message);
    return {
      status: "error",
      message: "Sorry, your message could not be sent right now. Please try again later or email us directly.",
      errors: {},
      values,
    };
  }

  return {
    status: "success",
    message: "Thank you. Your message has been sent, and we aim to reply within a few working days.",
    errors: {},
    values: { name: "", email: "", subject: "", message: "" },
  };
}
