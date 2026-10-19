/**
 * Runs the Supabase migrations against an in-memory PostgreSQL (PGlite) and
 * checks the Row Level Security policies, grants and functions.
 *
 * Supabase-specific pieces (the anon/authenticated/service_role roles, their
 * default grants, auth.uid() and the storage tables) are recreated with
 * minimal shims that follow Supabase's documented behaviour. This verifies
 * our SQL, not the hosted platform itself: re-run the manual checks in
 * README.md ("Security checks") against your real project.
 *
 *   npm run test:db
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = path.resolve(import.meta.dirname, "../..");
const migrationsDir = path.join(root, "supabase", "migrations");

const ADMIN = "11111111-1111-4111-8111-111111111111";
const OTHER_ADMIN = "33333333-3333-4333-8333-333333333333";
const USER = "22222222-2222-4222-8222-222222222222";
const DISABLED_ADMIN = "44444444-4444-4444-8444-444444444444";

const SUPABASE_SHIM = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;

  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (
    id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text
  );
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.objects to anon, authenticated, service_role;
`;

let db;

async function as(role, userId, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId || ""}', false); set role ${role};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}

async function rows(sql, params) {
  return (await db.query(sql, params)).rows;
}

async function rejects(promise, pattern) {
  await assert.rejects(promise, (error) => {
    assert.match(String(error.message), pattern);
    return true;
  });
}

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  for (const file of fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN}', 'admin@example.com'),
      ('${OTHER_ADMIN}', 'second@example.com'),
      ('${USER}', 'user@example.com'),
      ('${DISABLED_ADMIN}', 'old@example.com');
    insert into public.admin_users (user_id, email) values
      ('${ADMIN}', 'admin@example.com'),
      ('${OTHER_ADMIN}', 'second@example.com');
    insert into public.admin_users (user_id, email, disabled_at) values ('${DISABLED_ADMIN}', 'old@example.com', now());
  `);
});

after(async () => {
  await db?.close();
});

function articleInsert(slug, extra = "") {
  return `insert into public.articles (slug, title, excerpt, body, category_slug, author_slug, status, published_at, editorial_notes${extra ? ", " + extra.split("=")[0] : ""})
          values ('${slug}', 'Title ${slug}', 'Excerpt', 'Body text', 'banking', 'editorial-team', $1, $2, 'private note'${extra ? ", " + extra.split("=")[1] : ""})
          returning id, created_by, status`;
}

test("seed data is present", async () => {
  const cats = await rows("select count(*)::int as n from public.categories");
  assert.equal(cats[0].n, 9);
  const authors = await rows("select slug from public.authors");
  assert.deepEqual(authors.map((a) => a.slug), ["editorial-team"]);
});

test("admins can create articles; created_by and a revision are recorded", async () => {
  await as("authenticated", ADMIN, async () => {
    const [draft] = await rows(articleInsert("draft-article"), ["draft", null]);
    assert.equal(draft.created_by, ADMIN);
    await rows(articleInsert("published-article"), ["published", new Date(Date.now() - 60_000).toISOString()]);
    await rows(articleInsert("scheduled-article"), ["scheduled", new Date(Date.now() + 86_400_000).toISOString()]);
    await rows(articleInsert("due-article"), ["scheduled", new Date(Date.now() - 1000).toISOString()]);
    await rows(articleInsert("trashed-article"), ["published", new Date(Date.now() - 60_000).toISOString()]);
    await rows("update public.articles set deleted_at = now() where slug = 'trashed-article'");
    await rows(articleInsert("imported-article", "source_type='mdx-import'"), ["draft", null]);

    const revisions = await rows(
      "select action from public.article_revisions r join public.articles a on a.id = r.article_id where a.slug = 'trashed-article' order by r.id"
    );
    assert.deepEqual(revisions.map((r) => r.action), ["created", "trashed"]);
  });
});

test("anon readers see only published, non-deleted articles", async () => {
  const visible = await as("anon", null, () => rows("select slug from public.articles order by slug"));
  assert.deepEqual(visible.map((r) => r.slug), ["published-article"]);
});

test("anon readers cannot read private columns", async () => {
  await as("anon", null, () => rejects(db.query("select editorial_notes from public.articles"), /permission denied/));
  await as("anon", null, () => rejects(db.query("select review_notes from public.articles"), /permission denied/));
  await as("anon", null, () => rejects(db.query("select * from public.articles"), /permission denied/));
});

test("anon readers cannot write anything", async () => {
  await as("anon", null, () => rejects(db.query(articleInsert("anon-article"), ["draft", null]), /permission denied/));
  await as("anon", null, () =>
    rejects(db.query("update public.articles set title = 'x'"), /permission denied/)
  );
  await as("anon", null, () =>
    rejects(db.query("insert into public.categories (slug, name) values ('x', 'X')"), /permission denied/)
  );
  await as("anon", null, () =>
    rejects(db.query(`insert into public.admin_users (user_id, email) values ('${USER}', 'x')`), /permission denied/)
  );
});

test("signed-in users who are not admins can read and change nothing", async () => {
  await as("authenticated", USER, async () => {
    assert.equal((await rows("select id from public.articles")).length, 0);
    assert.equal((await rows("select id from public.article_revisions")).length, 0);
    assert.equal((await rows("select user_id from public.admin_users")).length, 0);
    await rejects(db.query(articleInsert("user-article"), ["draft", null]), /row-level security/);
    const updated = await db.query("update public.articles set title = 'hacked' returning id");
    assert.equal(updated.rows.length, 0);
    const deleted = await db.query("delete from public.articles returning id");
    assert.equal(deleted.rows.length, 0);
    await rejects(db.query("insert into public.categories (slug, name) values ('x', 'X')"), /row-level security/);
    await rejects(db.query("insert into public.media (storage_path, public_url, mime_type, size_bytes) values ('a', 'b', 'image/png', 1)"), /row-level security/);
    await rejects(db.query("insert into storage.objects (bucket_id, name) values ('article-images', 'x.png')"), /row-level security/);
  });
});

test("nobody can grant themselves admin rights through the API", async () => {
  await as("authenticated", USER, async () => {
    await rejects(db.query(`insert into public.admin_users (user_id, email) values ('${USER}', 'user@example.com')`), /permission denied/);
    await rejects(db.query("update public.admin_users set disabled_at = null"), /permission denied/);
    assert.equal((await rows("select public.is_admin() as ok"))[0].ok, false);
  });
  await as("authenticated", ADMIN, async () => {
    await rejects(db.query(`insert into public.admin_users (user_id, email) values ('${USER}', 'user@example.com')`), /permission denied/);
    assert.equal((await rows("select public.is_admin() as ok"))[0].ok, true);
    const own = await rows("select user_id from public.admin_users");
    assert.deepEqual(own.map((r) => r.user_id), [ADMIN]);
  });
});

test("disabled admins lose access", async () => {
  await as("authenticated", DISABLED_ADMIN, async () => {
    assert.equal((await rows("select public.is_admin() as ok"))[0].ok, false);
    assert.equal((await rows("select id from public.articles")).length, 0);
  });
});

test("published slugs are locked and future publish times are rejected", async () => {
  await as("authenticated", ADMIN, async () => {
    await rejects(db.query("update public.articles set slug = 'renamed' where slug = 'published-article'"), /cannot be changed/);
    await rows("update public.articles set slug = 'draft-article-renamed' where slug = 'draft-article'");
    await rejects(
      db.query("update public.articles set status = 'published', published_at = now() + interval '2 days' where slug = 'draft-article-renamed'"),
      /future publication time/
    );
    await rejects(db.query("update public.articles set status = 'scheduled', published_at = null where slug = 'draft-article-renamed'"), /articles_scheduled_has_time/);
  });
});

test("unpublishing removes public access", async () => {
  await as("authenticated", ADMIN, () => rows("update public.articles set status = 'draft' where slug = 'published-article'"));
  const visible = await as("anon", null, () => rows("select slug from public.articles"));
  assert.equal(visible.length, 0);
  await as("authenticated", ADMIN, () => rows("update public.articles set status = 'published' where slug = 'published-article'"));
  const actions = await as("authenticated", ADMIN, () =>
    rows("select action from public.article_revisions r join public.articles a on a.id = r.article_id where a.slug = 'published-article' order by r.id")
  );
  assert.deepEqual(actions.map((r) => r.action), ["created", "unpublished", "published"]);
});

test("privileged functions are not callable by anon or signed-in users", async () => {
  for (const role of ["anon", "authenticated"]) {
    await as(role, role === "anon" ? null : ADMIN, async () => {
      await rejects(db.query("select * from public.publish_due_articles()"), /permission denied/);
      await rejects(db.query("select public.register_login_attempt('k', 5, 60)"), /permission denied/);
      await rejects(db.query("select public.clear_login_attempts('k')"), /permission denied/);
      await rejects(db.query("select * from public.auth_login_attempts"), /permission denied/);
    });
  }
  await as("anon", null, () => rejects(db.query("select public.is_admin()"), /permission denied/));
});

test("scheduled publishing publishes only articles that are due", async () => {
  const published = await as("service_role", null, () => rows("select slug from public.publish_due_articles()"));
  assert.deepEqual(published.map((r) => r.slug), ["due-article"]);
  const visible = await as("anon", null, () => rows("select slug from public.articles order by slug"));
  assert.deepEqual(visible.map((r) => r.slug), ["due-article", "published-article"]);
  const again = await as("service_role", null, () => rows("select slug from public.publish_due_articles()"));
  assert.equal(again.length, 0);
});

test("login attempts are rate limited per key", async () => {
  const results = [];
  for (let i = 0; i < 4; i += 1) {
    const [r] = await as("service_role", null, () => rows("select public.register_login_attempt('email:abc', 3, 900) as ok"));
    results.push(r.ok);
  }
  assert.deepEqual(results, [true, true, true, false]);
  await as("service_role", null, () => rows("select public.clear_login_attempts('email:abc')"));
  const [r] = await as("service_role", null, () => rows("select public.register_login_attempt('email:abc', 3, 900) as ok"));
  assert.equal(r.ok, true);
});

test("imported MDX slugs are exposed, nothing else", async () => {
  const slugs = await as("anon", null, () => rows("select * from public.mdx_import_slugs() as slug"));
  assert.deepEqual(slugs.map((r) => r.slug), ["imported-article"]);
});

test("storage writes require an admin", async () => {
  await as("authenticated", ADMIN, () => rows("insert into storage.objects (bucket_id, name) values ('article-images', 'ok.png')"));
  await as("authenticated", ADMIN, async () => {
    await rejects(db.query("insert into storage.objects (bucket_id, name) values ('other-bucket', 'x.png')"), /row-level security|foreign key/);
  });
  const anonList = await as("anon", null, () => rows("select name from storage.objects"));
  assert.equal(anonList.length, 0);
  const bucket = await rows("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'article-images'");
  assert.equal(bucket[0].public, true);
  assert.equal(Number(bucket[0].file_size_limit), 4194304);
  assert.ok(!bucket[0].allowed_mime_types.includes("image/svg+xml"));
});

test("previews are private to admins and cannot be created for someone else", async () => {
  await as("authenticated", ADMIN, async () => {
    await rows(`insert into public.article_previews (payload) values ('{"title":"x"}')`);
    await rejects(
      db.query(`insert into public.article_previews (payload, created_by) values ('{}', '${OTHER_ADMIN}')`),
      /row-level security/
    );
  });
  const userView = await as("authenticated", USER, () => rows("select id from public.article_previews"));
  assert.equal(userView.length, 0);
  await rejects(as("anon", null, () => db.query("select id from public.article_previews")), /permission denied/);
});

test("categories in use cannot be deleted", async () => {
  await as("authenticated", ADMIN, () =>
    rejects(db.query("delete from public.categories where slug = 'banking'"), /foreign key/)
  );
});
