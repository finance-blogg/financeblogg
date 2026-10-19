import { createHash, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { invalidateArticles } from "@/lib/cms/revalidate";

/**
 * Publishes scheduled articles whose time has come.
 *
 * Called by Vercel Cron (see vercel.json) or any scheduler that can send
 *   Authorization: Bearer <CRON_SECRET>
 * Vercel sends that header automatically when CRON_SECRET is set.
 */

function authorised(request) {
  const secret = process.env.CRON_SECRET || "";
  if (secret.length < 16) return false;
  const header = request.headers.get("authorization") || "";
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  const received = createHash("sha256").update(header).digest();
  return timingSafeEqual(expected, received);
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}

async function run(request) {
  if (!process.env.CRON_SECRET) return json({ error: "Scheduled publishing is not configured (CRON_SECRET is missing)." }, 503);
  if (!authorised(request)) return json({ error: "Unauthorized" }, 401);

  const supabase = createServiceClient();
  if (!supabase) return json({ error: "SUPABASE_SECRET_KEY is not configured." }, 503);

  const { data, error } = await supabase.rpc("publish_due_articles");
  if (error) {
    console.error("[cron] publish_due_articles failed:", error.message);
    return json({ error: "Publishing failed." }, 500);
  }

  const published = data || [];
  if (published.length) {
    invalidateArticles({
      slugs: published.map((a) => a.slug),
      categories: published.map((a) => a.category_slug),
      context: "route",
    });
  }
  return json({ published: published.map((a) => a.slug), checkedAt: new Date().toISOString() });
}

export const GET = run;
export const POST = run;
