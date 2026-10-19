"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeAdminPath } from "@/lib/auth/redirect";
import { clearLoginAttempts, consumeLoginAttempt, RATE_LIMIT_MINUTES } from "@/lib/auth/rate-limit";

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const GENERIC_FAILURE = "The email or password is incorrect.";

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export async function signIn(prevState, formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase().slice(0, 254);
  const password = String(formData.get("password") || "");
  const next = safeAdminPath(String(formData.get("next") || ""));

  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured on this deployment yet.", email };
  }
  if (!EMAIL_PATTERN.test(email) || password.length < 6 || password.length > 200) {
    return { error: GENERIC_FAILURE, email };
  }

  if (!(await consumeLoginAttempt({ email, ip: await clientIp() }))) {
    return { error: `Too many sign-in attempts. Wait ${RATE_LIMIT_MINUTES} minutes and try again.`, email };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    // Same message for unknown accounts and wrong passwords, so emails cannot be probed.
    return { error: GENERIC_FAILURE, email };
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id,disabled_at")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (adminError || !admin || admin.disabled_at) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "This account is not authorised to use the dashboard. Ask the site owner to add it to the administrator list.", email };
  }

  await clearLoginAttempts({ email });
  redirect(next);
}

export async function signOut() {
  const supabase = await createServerSupabase();
  if (supabase) await supabase.auth.signOut({ scope: "local" });
  redirect("/admin/login?reason=signed-out");
}
