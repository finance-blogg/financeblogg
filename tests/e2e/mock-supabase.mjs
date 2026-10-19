#!/usr/bin/env node
/**
 * A small, in-memory stand-in for the parts of the Supabase HTTP API this app
 * uses (Auth password sign-in, PostgREST tables/RPCs, Storage). It exists only
 * to exercise the dashboard end to end on a developer machine without a real
 * project. It is NOT Supabase: Row Level Security is approximated here, and
 * the real policies are tested separately in tests/db/policies.test.mjs.
 *
 *   node tests/e2e/mock-supabase.mjs            # listens on http://127.0.0.1:54321
 *
 * Accounts: admin@example.com / correct-horse-battery (admin)
 *           user@example.com  / correct-horse-battery (signed-in, not admin)
 * Keys:     publishable "mock-publishable-key", secret "mock-secret-key"
 */
import http from "node:http";
import { createHmac, randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 54321);
const JWT_SECRET = "mock-jwt-secret";
const PUBLISHABLE = "mock-publishable-key";
const SECRET = "mock-secret-key";
const PASSWORD = "correct-horse-battery";

const users = [
  { id: "11111111-1111-4111-8111-111111111111", email: "admin@example.com" },
  { id: "22222222-2222-4222-8222-222222222222", email: "user@example.com" },
];
const now = () => new Date().toISOString();

const db = {
  admin_users: [{ user_id: users[0].id, email: users[0].email, display_name: "Test Admin", created_at: now(), disabled_at: null }],
  categories: [
    ["personal-finance", "Personal Finance", "Personal Finance"],
    ["banking", "Banking", "Banking"],
    ["loans-and-credit", "Loans and Credit", "Loans & Credit"],
    ["saving-money", "Saving Money", "Saving"],
    ["investment-education", "Investment Education", "Investing"],
    ["mutual-funds", "Mutual Funds", "Mutual Funds"],
    ["insurance-education", "Insurance Education", "Insurance"],
    ["tax-and-gst", "Tax and GST", "Tax & GST"],
    ["financial-news-and-updates", "Financial News and Updates", "News & Updates"],
  ].map(([slug, name, short_name], i) => ({ slug, name, short_name, description: `${name} description.`, sort_order: (i + 1) * 10, created_at: now(), updated_at: now() })),
  authors: [
    {
      slug: "editorial-team",
      name: "FinanceBlogg Editorial Team",
      role: "Editorial Team",
      bio: "The FinanceBlogg editorial team researches and writes educational explainers on personal finance in India.",
      expertise: [],
      credentials: [],
      links: {},
      image_url: null,
      is_organization: true,
      created_at: now(),
      updated_at: now(),
    },
  ],
  articles: [],
  article_revisions: [],
  media: [],
  article_previews: [],
};
const loginAttempts = [];
const objects = new Map();
let revisionId = 1;

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}
function sign(payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}
function verify(token) {
  const [h, p, s] = String(token || "").split(".");
  if (!h || !p || !s) return null;
  if (createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest("base64url") !== s) return null;
  const payload = JSON.parse(Buffer.from(p, "base64url").toString());
  return payload.exp > Date.now() / 1000 ? payload : null;
}

function session(user, signedInAt = Math.floor(Date.now() / 1000)) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const access_token = sign({
    sub: user.id,
    email: user.email,
    aud: "authenticated",
    role: "authenticated",
    iat,
    exp,
    session_id: randomUUID(),
    amr: [{ method: "password", timestamp: signedInAt }],
    app_metadata: { provider: "email" },
    user_metadata: {},
    is_anonymous: false,
  });
  return {
    access_token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    refresh_token: `refresh:${user.id}:${signedInAt}:${randomUUID()}`,
    user: userObject(user),
  };
}
function userObject(user) {
  return { id: user.id, aud: "authenticated", role: "authenticated", email: user.email, app_metadata: { provider: "email" }, user_metadata: {}, created_at: now() };
}

function caller(req) {
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (bearer === SECRET || req.headers.apikey === SECRET) return { role: "service" };
  const claims = verify(bearer);
  if (claims) {
    const admin = db.admin_users.find((a) => a.user_id === claims.sub && !a.disabled_at);
    return { role: admin ? "admin" : "user", uid: claims.sub };
  }
  return { role: "anon" };
}

function parseValue(v) {
  if (v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}
function matches(row, column, expr) {
  const negate = expr.startsWith("not.");
  const e = negate ? expr.slice(4) : expr;
  const dot = e.indexOf(".");
  const op = e.slice(0, dot);
  const raw = e.slice(dot + 1);
  const value = row[column];
  let ok;
  if (op === "eq") ok = String(value) === raw || value === parseValue(raw);
  else if (op === "neq") ok = String(value) !== raw;
  else if (op === "is") ok = value === parseValue(raw) || (raw === "null" && value === undefined);
  else if (op === "in") ok = raw.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")).includes(String(value));
  else if (["lt", "lte", "gt", "gte"].includes(op)) {
    const a = Date.parse(value) || Number(value);
    const b = Date.parse(raw) || Number(raw);
    ok = value != null && { lt: a < b, lte: a <= b, gt: a > b, gte: a >= b }[op];
  } else if (op === "ilike" || op === "like") {
    const re = new RegExp(`^${raw.replace(/[.+?^${}()|[\]]/g, "\\$&").replace(/\\\\([%_])/g, "$1").replace(/[%*]/g, ".*")}$`, op === "ilike" ? "is" : "s");
    ok = re.test(String(value ?? ""));
  } else if (op.startsWith("wfts") || op.startsWith("fts") || op.startsWith("plfts")) {
    const text = `${row.title} ${row.excerpt} ${row.subtitle} ${(row.tags || []).join(" ")} ${row.body}`.toLowerCase();
    ok = raw.toLowerCase().split(/\s+/).every((t) => text.includes(t));
  } else ok = true;
  return negate ? !ok : ok;
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
function applyQuery(rows, params) {
  let result = rows.filter((row) => [...params].every(([k, v]) => RESERVED.has(k) || matches(row, k, v)));
  const order = params.get("order");
  if (order) {
    const keys = order.split(",").map((o) => o.split("."));
    result = [...result].sort((a, b) => {
      for (const [col, dir] of keys) {
        const x = a[col] ?? "";
        const y = b[col] ?? "";
        if (x === y) continue;
        return (x < y ? -1 : 1) * (dir === "desc" ? -1 : 1);
      }
      return 0;
    });
  }
  return result;
}
function project(row, select) {
  if (!select || select === "*") return row;
  const out = {};
  for (const col of select.split(",")) out[col.trim()] = row[col.trim()] ?? null;
  return out;
}

const PUBLIC_ARTICLE = (a) => a.status === "published" && !a.deleted_at && Date.parse(a.published_at) <= Date.now();

function visibleRows(table, who) {
  const rows = db[table];
  if (who.role === "service" || who.role === "admin") return rows;
  if (table === "categories" || table === "authors") return rows;
  if (table === "admin_users") return who.uid ? rows.filter((r) => r.user_id === who.uid) : [];
  if (table === "articles" && who.role === "anon") return rows.filter(PUBLIC_ARTICLE);
  return [];
}

function articleTrigger(row, previous, who) {
  if (previous && previous.first_published_at && row.slug !== previous.slug) {
    throw Object.assign(new Error("The URL slug of an article that has been published cannot be changed."), { code: "23514" });
  }
  if (row.status === "published") {
    row.published_at = row.published_at || now();
    row.first_published_at = previous?.first_published_at || row.first_published_at || row.published_at;
  }
  if (previous) {
    row.created_at = previous.created_at;
    row.source_type = previous.source_type;
  }
  row.updated_at = new Date(Date.now() + Math.random()).toISOString();
  row.updated_by = who.uid || null;
  const action = !previous
    ? "created"
    : !previous.deleted_at && row.deleted_at
      ? "trashed"
      : previous.deleted_at && !row.deleted_at
        ? "restored"
        : previous.status !== row.status
          ? row.status === "published"
            ? "published"
            : row.status === "scheduled"
              ? "scheduled"
              : previous.status === "published"
                ? "unpublished"
                : "unscheduled"
          : "updated";
  db.article_revisions.push({ id: revisionId++, article_id: row.id, action, status: row.status, title: row.title, snapshot: { ...row }, created_by: who.uid || null, created_at: now() });
}

const DEFAULTS = {
  articles: () => ({
    id: randomUUID(), subtitle: "", excerpt: "", body: "", featured_image_url: null, featured_image_alt: "", featured_image_width: null, featured_image_height: null,
    featured_image_credit: "", category_slug: null, author_slug: null, tags: [], seo_title: "", seo_description: "", canonical_url: null, status: "draft",
    published_at: null, first_published_at: null, updated_on: null, featured: false, sources: [], fact_check_status: "pending", reviewed_by: null, reviewed_on: null,
    review_notes: "", editorial_notes: "", reading_minutes: 1, word_count: 0, source_type: "cms", created_at: now(), deleted_at: null,
  }),
  media: () => ({ id: randomUUID(), alt_text: "", created_at: now(), updated_at: now() }),
  article_previews: () => ({ id: randomUUID(), created_at: now(), expires_at: new Date(Date.now() + 7200_000).toISOString() }),
  categories: () => ({ created_at: now(), updated_at: now(), sort_order: 100, short_name: "", description: "" }),
  authors: () => ({ created_at: now(), updated_at: now(), role: "", bio: "", expertise: [], credentials: [], links: {}, image_url: null, is_organization: false }),
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
}
function pgError(res, status, code, message) {
  send(res, status, { code, message, details: null, hint: null });
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

function respondRows(req, res, rows, total) {
  const params = new URL(req.url, "http://x").searchParams;
  const select = params.get("select");
  const offset = Number(params.get("offset") || 0);
  const limit = params.get("limit") ? Number(params.get("limit")) : rows.length;
  const page = rows.slice(offset, offset + limit).map((r) => project(r, select));
  const headers = {};
  if ((req.headers.prefer || "").includes("count=exact")) headers["Content-Range"] = `${offset}-${offset + page.length - 1}/${total ?? rows.length}`;
  if ((req.headers.accept || "").includes("vnd.pgrst.object")) {
    if (page.length !== 1) return pgError(res, 406, "PGRST116", "JSON object requested, multiple (or no) rows returned");
    return send(res, 200, page[0], headers);
  }
  if (req.method === "HEAD") {
    res.writeHead(200, headers);
    return res.end();
  }
  return send(res, 200, page, headers);
}

async function rest(req, res, table, params) {
  const who = caller(req);
  if (!db[table]) return pgError(res, 404, "42P01", `relation "${table}" does not exist`);
  if (req.method === "GET" || req.method === "HEAD") {
    if (table === "article_previews" && who.role === "anon") return pgError(res, 401, "42501", "permission denied");
    const rows = applyQuery(visibleRows(table, who), params);
    return respondRows(req, res, rows);
  }

  const writable = who.role === "admin" || who.role === "service";
  if (!writable) return pgError(res, who.role === "anon" ? 401 : 403, "42501", "new row violates row-level security policy");
  if (table === "admin_users") return pgError(res, 403, "42501", "permission denied for table admin_users");

  const body = req.method === "DELETE" ? null : JSON.parse((await readBody(req)).toString() || "null");
  try {
    if (req.method === "POST") {
      const items = Array.isArray(body) ? body : [body];
      const created = [];
      for (const item of items) {
        const key = table === "categories" || table === "authors" ? "slug" : "id";
        const existing = db[table].find((r) => r[key] === item[key] || (table === "articles" && r.slug === item.slug));
        if (existing) {
          if ((req.headers.prefer || "").includes("ignore-duplicates")) continue;
          return pgError(res, 409, "23505", "duplicate key value violates unique constraint");
        }
        const row = { ...(DEFAULTS[table]?.() || {}), ...item };
        if (table === "articles") {
          if (row.category_slug && !db.categories.some((c) => c.slug === row.category_slug)) return pgError(res, 409, "23503", "foreign key violation");
          row.created_by = who.uid || null;
          articleTrigger(row, null, who);
        }
        db[table].push(row);
        created.push(row);
      }
      return respondRows(req, res, created);
    }
    const targets = applyQuery(db[table], params);
    if (req.method === "PATCH") {
      for (const target of targets) {
        const next = { ...target, ...body };
        if (table === "articles") articleTrigger(next, target, who);
        else if ("updated_at" in target) next.updated_at = now();
        Object.assign(target, next);
      }
      return respondRows(req, res, targets);
    }
    if (req.method === "DELETE") {
      if (table === "categories" && targets.some((c) => db.articles.some((a) => a.category_slug === c.slug))) {
        return pgError(res, 409, "23503", "update or delete on table categories violates foreign key constraint");
      }
      db[table] = db[table].filter((r) => !targets.includes(r));
      if (table === "articles") db.article_revisions = db.article_revisions.filter((r) => !targets.some((t) => t.id === r.article_id));
      return respondRows(req, res, targets);
    }
  } catch (error) {
    return pgError(res, 400, error.code || "P0001", error.message);
  }
  return pgError(res, 405, "PGRST", "method not allowed");
}

async function rpc(req, res, name) {
  const who = caller(req);
  const args = JSON.parse((await readBody(req)).toString() || "{}");
  if (name === "mdx_import_slugs") return send(res, 200, db.articles.filter((a) => a.source_type === "mdx-import").map((a) => a.slug));
  if (who.role !== "service") return pgError(res, 403, "42501", `permission denied for function ${name}`);
  if (name === "register_login_attempt") {
    const since = Date.now() - args.p_window_seconds * 1000;
    const count = loginAttempts.filter((a) => a.key === args.p_key && a.at > since).length;
    if (count >= args.p_max) return send(res, 200, false);
    loginAttempts.push({ key: args.p_key, at: Date.now() });
    return send(res, 200, true);
  }
  if (name === "clear_login_attempts") {
    for (let i = loginAttempts.length - 1; i >= 0; i -= 1) if (loginAttempts[i].key === args.p_key) loginAttempts.splice(i, 1);
    return send(res, 200, null);
  }
  if (name === "publish_due_articles") {
    const due = db.articles.filter((a) => a.status === "scheduled" && !a.deleted_at && Date.parse(a.published_at) <= Date.now());
    for (const a of due) {
      const next = { ...a, status: "published" };
      articleTrigger(next, a, who);
      Object.assign(a, next);
    }
    return send(res, 200, due.map((a) => ({ id: a.id, slug: a.slug, category_slug: a.category_slug })));
  }
  return pgError(res, 404, "PGRST202", `function ${name} not found`);
}

async function auth(req, res, url) {
  if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
    const { email, password } = JSON.parse((await readBody(req)).toString());
    const user = users.find((u) => u.email === email);
    if (!user || password !== PASSWORD) return send(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
    return send(res, 200, session(user));
  }
  if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "refresh_token") {
    const { refresh_token } = JSON.parse((await readBody(req)).toString());
    const [, id, signedInAt] = String(refresh_token).split(":");
    const user = users.find((u) => u.id === id);
    if (!user) return send(res, 400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
    return send(res, 200, session(user, Number(signedInAt)));
  }
  if (url.pathname === "/auth/v1/user") {
    const claims = verify((req.headers.authorization || "").replace(/^Bearer\s+/i, ""));
    const user = claims && users.find((u) => u.id === claims.sub);
    if (!user) return send(res, 403, { code: 403, error_code: "bad_jwt", msg: "invalid JWT" });
    return send(res, 200, userObject(user));
  }
  if (url.pathname === "/auth/v1/logout") {
    res.writeHead(204);
    return res.end();
  }
  return send(res, 404, { msg: "not found" });
}

async function storage(req, res, url) {
  const pub = url.pathname.match(/^\/storage\/v1\/object\/public\/article-images\/(.+)$/);
  if (pub && req.method === "GET") {
    const obj = objects.get(decodeURIComponent(pub[1]));
    if (!obj) return send(res, 404, { error: "not_found" });
    res.writeHead(200, { "Content-Type": obj.type, "Cache-Control": "public, max-age=31536000" });
    return res.end(obj.bytes);
  }
  const who = caller(req);
  if (who.role !== "admin" && who.role !== "service") return send(res, 403, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
  const put = url.pathname.match(/^\/storage\/v1\/object\/article-images\/(.+)$/);
  if (put && req.method === "POST") {
    const path = decodeURIComponent(put[1]);
    if (objects.has(path)) return send(res, 409, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
    const bytes = await readBody(req);
    if (bytes.length > 4 * 1024 * 1024) return send(res, 413, { statusCode: "413", error: "Payload too large" });
    objects.set(path, { bytes, type: req.headers["content-type"] || "application/octet-stream" });
    return send(res, 200, { Key: `article-images/${path}`, Id: randomUUID() });
  }
  if (url.pathname === "/storage/v1/object/article-images" && req.method === "DELETE") {
    const { prefixes = [] } = JSON.parse((await readBody(req)).toString() || "{}");
    for (const p of prefixes) objects.delete(p);
    return send(res, 200, prefixes.map((name) => ({ name })));
  }
  return send(res, 404, { error: "not_found" });
}

http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      if (req.method === "OPTIONS") return send(res, 204);
      if (url.pathname.startsWith("/auth/v1/")) return await auth(req, res, url);
      if (url.pathname.startsWith("/storage/v1/")) return await storage(req, res, url);
      const rpcMatch = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
      if (rpcMatch) return await rpc(req, res, rpcMatch[1]);
      const tableMatch = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
      if (tableMatch) return await rest(req, res, tableMatch[1], url.searchParams);
      if (url.pathname === "/__state") return send(res, 200, { articles: db.articles.map(({ body, ...a }) => a), media: db.media, revisions: db.article_revisions.length });
      return send(res, 404, { message: "not found" });
    } catch (error) {
      console.error(error);
      send(res, 500, { message: error.message });
    }
  })
  .listen(PORT, "127.0.0.1", () => console.log(`Mock Supabase listening on http://127.0.0.1:${PORT}`));
