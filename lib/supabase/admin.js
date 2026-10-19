import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseUrl } from "./config";

function secretKey() {
  return (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

export function isServiceRoleConfigured() {
  return isSupabaseConfigured() && Boolean(secretKey());
}

/**
 * Privileged client that bypasses Row Level Security. Only for narrow
 * server tasks that have no user session: login rate limiting and the
 * scheduled-publishing job. Never use it to serve admin requests.
 */
export function createServiceClient() {
  if (!isServiceRoleConfigured()) return null;
  return createClient(supabaseUrl, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
