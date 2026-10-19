import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Brute-force protection for the admin login.
 *
 * Limits: 5 attempts per email and 20 per IP address in 15 minutes. With
 * SUPABASE_SECRET_KEY set, attempts are counted in Postgres so the limit holds
 * across all serverless instances. Without it, a per-instance in-memory
 * counter is used (weaker; the README explains why the key is recommended).
 * Keys are SHA-256 hashes, so raw emails and IPs are never stored.
 */

const WINDOW_SECONDS = 15 * 60;
const LIMITS = { email: 5, ip: 20 };
const memory = new Map();

function hashKey(kind, value) {
  return `${kind}:${createHash("sha256").update(String(value).toLowerCase()).digest("hex")}`;
}

function memoryAttempt(key, max) {
  const now = Date.now();
  const recent = (memory.get(key) || []).filter((t) => now - t < WINDOW_SECONDS * 1000);
  if (recent.length >= max) {
    memory.set(key, recent);
    return false;
  }
  recent.push(now);
  memory.set(key, recent);
  if (memory.size > 5000) memory.clear();
  return true;
}

async function attempt(client, key, max) {
  if (!client) return memoryAttempt(key, max);
  const { data, error } = await client.rpc("register_login_attempt", {
    p_key: key,
    p_max: max,
    p_window_seconds: WINDOW_SECONDS,
  });
  if (error) {
    console.error("[auth] rate limit check failed, using in-memory fallback:", error.message);
    return memoryAttempt(key, max);
  }
  return data === true;
}

/** Records one login attempt. Returns false when the caller must wait. */
export async function consumeLoginAttempt({ email, ip }) {
  const client = createServiceClient();
  const [emailOk, ipOk] = await Promise.all([
    attempt(client, hashKey("email", email), LIMITS.email),
    attempt(client, hashKey("ip", ip || "unknown"), LIMITS.ip),
  ]);
  return emailOk && ipOk;
}

/** Clears the per-email counter after a successful admin sign-in. */
export async function clearLoginAttempts({ email }) {
  const key = hashKey("email", email);
  memory.delete(key);
  const client = createServiceClient();
  if (!client) return;
  const { error } = await client.rpc("clear_login_attempts", { p_key: key });
  if (error) console.error("[auth] could not clear login attempts:", error.message);
}

export const RATE_LIMIT_MINUTES = WINDOW_SECONDS / 60;
