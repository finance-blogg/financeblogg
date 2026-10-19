import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./config";

/**
 * Cookie-less client for public reads inside `use cache` scopes. It always
 * acts as the `anon` role, so Row Level Security limits it to published
 * content regardless of who is visiting.
 */
export function createPublicClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
