#!/usr/bin/env node
/**
 * Sets a new password for an existing Supabase Auth user.
 *
 *   npm run cms:set-password -- you@example.com
 *
 * Asks for the new password without echoing it. Uses SUPABASE_SECRET_KEY
 * (server-only) from .env.local or the environment. Run it on your own
 * computer, never in a shared terminal or CI log.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
for (const file of [".env", ".env.local"]) {
  if (fs.existsSync(path.join(root, file))) {
    try {
      process.loadEnvFile(path.join(root, file));
    } catch {
      // Ignore malformed env files here.
    }
  }
}

const email = String(process.argv[2] || "").trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !url || !key) {
  console.error("Usage: npm run cms:set-password -- you@example.com (needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY)");
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) rl.output.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let user = null;
for (let page = 1; !user && page <= 50; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
  if (error) {
    console.error(`Could not list users: ${error.message}`);
    process.exit(1);
  }
  user = data.users.find((u) => (u.email || "").toLowerCase() === email) || null;
  if (data.users.length < 100) break;
}
if (!user) {
  console.error(`No Auth user with the email ${email}.`);
  process.exit(1);
}

const password = await askHidden("New password (at least 12 characters): ");
const confirm = await askHidden("Repeat the new password: ");
if (password.length < 12) {
  console.error("The password must be at least 12 characters.");
  process.exit(1);
}
if (password !== confirm) {
  console.error("The passwords do not match.");
  process.exit(1);
}

const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
if (error) {
  console.error(`Could not update the password: ${error.message}`);
  process.exit(1);
}
console.log(`Password updated for ${email}. Existing sessions stay valid until they expire; sign out everywhere from the Supabase dashboard if needed.`);
