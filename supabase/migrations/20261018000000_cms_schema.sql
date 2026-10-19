-- FinanceBlogg CMS schema.
--
-- Apply with the Supabase CLI (`supabase db push`) or paste into the Supabase
-- SQL editor and run once. See docs/DATABASE.md for a description of every
-- table, policy and function.
--
-- Security model
--   * anon          : public readers. May read published, non-deleted articles
--                     (public columns only), categories and authors.
--   * authenticated : signed-in users. Everything is gated on public.is_admin(),
--                     so a signed-in user who is not on the allowlist can read
--                     and change nothing.
--   * service_role  : server-only key. Used for login rate limiting and the
--                     scheduled-publishing job, through narrow functions.
--   * public.admin_users can only be changed by the database owner (SQL editor),
--     so nobody can grant themselves admin rights through the API.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Administrators (allowlist)
-- ---------------------------------------------------------------------------

create table public.admin_users (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text not null default '',
  created_at   timestamptz not null default now(),
  disabled_at  timestamptz
);

comment on table public.admin_users is
  'Allowlist of dashboard administrators. Insert rows from the SQL editor only; there are no API write policies.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
      and a.disabled_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

create table public.categories (
  slug        text primary key
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name        text not null check (char_length(name) between 1 and 80),
  short_name  text not null default '' check (char_length(short_name) <= 40),
  description text not null default '' check (char_length(description) <= 300),
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Authors
-- ---------------------------------------------------------------------------

create table public.authors (
  slug            text primary key
                  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name            text not null check (char_length(name) between 1 and 120),
  role            text not null default '' check (char_length(role) <= 120),
  bio             text not null default '' check (char_length(bio) <= 2000),
  expertise       text[] not null default '{}' check (cardinality(expertise) <= 30),
  credentials     text[] not null default '{}' check (cardinality(credentials) <= 20),
  links           jsonb not null default '{}'::jsonb check (jsonb_typeof(links) = 'object'),
  image_url       text check (image_url is null or char_length(image_url) <= 1000),
  is_organization boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger authors_set_updated_at
  before update on public.authors
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Articles
-- ---------------------------------------------------------------------------

create table public.articles (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique
                        check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title                 text not null check (char_length(title) between 1 and 200),
  subtitle              text not null default '' check (char_length(subtitle) <= 300),
  excerpt               text not null default '' check (char_length(excerpt) <= 400),
  body                  text not null default '' check (char_length(body) <= 200000),

  featured_image_url    text check (featured_image_url is null or char_length(featured_image_url) <= 1000),
  featured_image_alt    text not null default '' check (char_length(featured_image_alt) <= 300),
  featured_image_width  integer check (featured_image_width is null or featured_image_width between 1 and 20000),
  featured_image_height integer check (featured_image_height is null or featured_image_height between 1 and 20000),
  featured_image_credit text not null default '' check (char_length(featured_image_credit) <= 300),

  category_slug         text references public.categories (slug) on update cascade on delete restrict,
  author_slug           text references public.authors (slug) on update cascade on delete restrict,
  tags                  text[] not null default '{}' check (cardinality(tags) <= 20),

  seo_title             text not null default '' check (char_length(seo_title) <= 120),
  seo_description       text not null default '' check (char_length(seo_description) <= 320),
  canonical_url         text check (canonical_url is null or (canonical_url ~ '^https://\S+$' and char_length(canonical_url) <= 500)),

  status                text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  -- Publication time for published articles; the planned time for scheduled ones.
  published_at          timestamptz,
  first_published_at    timestamptz,
  -- Public "Updated" date. Set only after a substantive change.
  updated_on            date,
  featured              boolean not null default false,

  sources               jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  fact_check_status     text not null default 'pending' check (fact_check_status in ('pending', 'verified')),
  reviewed_by           text references public.authors (slug) on update cascade on delete set null,
  reviewed_on           date,
  -- Private: never granted to anon.
  review_notes          text not null default '' check (char_length(review_notes) <= 5000),
  editorial_notes       text not null default '' check (char_length(editorial_notes) <= 10000),

  reading_minutes       integer not null default 1 check (reading_minutes between 1 and 600),
  word_count            integer not null default 0 check (word_count >= 0),
  source_type           text not null default 'cms' check (source_type in ('cms', 'mdx-import')),
  search_vector         tsvector,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references auth.users (id) on delete set null,
  updated_by            uuid references auth.users (id) on delete set null,
  deleted_at            timestamptz,

  constraint articles_scheduled_has_time check (status <> 'scheduled' or published_at is not null),
  constraint articles_published_has_time check (status <> 'published' or published_at is not null)
);

create index articles_public_listing_idx
  on public.articles (published_at desc)
  where status = 'published' and deleted_at is null;
create index articles_category_idx on public.articles (category_slug);
create index articles_author_idx on public.articles (author_slug);
create index articles_status_updated_idx on public.articles (status, updated_at desc);
create index articles_scheduled_idx on public.articles (published_at) where status = 'scheduled' and deleted_at is null;
create index articles_tags_idx on public.articles using gin (tags);
create index articles_search_idx on public.articles using gin (search_vector);

create or replace function public.articles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := coalesce((select auth.uid()), new.created_by);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.source_type := old.source_type;
    new.first_published_at := coalesce(old.first_published_at, new.first_published_at);
    if old.first_published_at is not null and new.slug <> old.slug then
      raise exception 'The URL slug of an article that has been published cannot be changed.'
        using errcode = 'check_violation';
    end if;
  end if;

  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
    if new.published_at > now() + interval '5 minutes' then
      raise exception 'A published article cannot have a future publication time. Schedule it instead.'
        using errcode = 'check_violation';
    end if;
    new.first_published_at := coalesce(new.first_published_at, new.published_at);
  end if;

  new.updated_at := now();
  new.updated_by := (select auth.uid());
  new.search_vector :=
       setweight(to_tsvector('english', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(new.subtitle, '') || ' ' || coalesce(new.excerpt, '')), 'B')
    || setweight(to_tsvector('english', array_to_string(new.tags, ' ')), 'B')
    || setweight(to_tsvector('english', coalesce(new.body, '')), 'D');
  return new;
end;
$$;

create trigger articles_before_write
  before insert or update on public.articles
  for each row execute function public.articles_before_write();

-- ---------------------------------------------------------------------------
-- Revision history (written only by trigger)
-- ---------------------------------------------------------------------------

create table public.article_revisions (
  id         bigint generated always as identity primary key,
  article_id uuid not null references public.articles (id) on delete cascade,
  action     text not null,
  status     text not null,
  title      text not null,
  snapshot   jsonb not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index article_revisions_article_idx on public.article_revisions (article_id, created_at desc);

create or replace function public.articles_record_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'created';
  else
    if (to_jsonb(old) - 'updated_at' - 'updated_by' - 'search_vector')
       = (to_jsonb(new) - 'updated_at' - 'updated_by' - 'search_vector') then
      return null;
    end if;
    if old.deleted_at is null and new.deleted_at is not null then
      v_action := 'trashed';
    elsif old.deleted_at is not null and new.deleted_at is null then
      v_action := 'restored';
    elsif old.status is distinct from new.status then
      v_action := case
        when new.status = 'published' then 'published'
        when new.status = 'scheduled' then 'scheduled'
        when old.status = 'published' then 'unpublished'
        else 'unscheduled'
      end;
    else
      v_action := 'updated';
    end if;
  end if;

  insert into public.article_revisions (article_id, action, status, title, snapshot, created_by)
  values (new.id, v_action, new.status, new.title, to_jsonb(new) - 'search_vector', (select auth.uid()));
  return null;
end;
$$;

create trigger articles_record_revision
  after insert or update on public.articles
  for each row execute function public.articles_record_revision();

-- ---------------------------------------------------------------------------
-- Media library
-- ---------------------------------------------------------------------------

create table public.media (
  id                uuid primary key default gen_random_uuid(),
  storage_path      text not null unique check (char_length(storage_path) <= 300),
  public_url        text not null check (char_length(public_url) <= 1000),
  alt_text          text not null default '' check (char_length(alt_text) <= 300),
  mime_type         text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif')),
  size_bytes        integer not null check (size_bytes between 1 and 5242880),
  width             integer check (width is null or width between 1 and 20000),
  height            integer check (height is null or height between 1 and 20000),
  original_filename text not null default '' check (char_length(original_filename) <= 255),
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index media_created_idx on public.media (created_at desc);

create trigger media_set_updated_at
  before update on public.media
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Short-lived previews of unsaved editor content
-- ---------------------------------------------------------------------------

create table public.article_previews (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles (id) on delete cascade,
  payload    jsonb not null,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours'
);

create index article_previews_expires_idx on public.article_previews (expires_at);

-- ---------------------------------------------------------------------------
-- Login rate limiting (service role only)
-- ---------------------------------------------------------------------------

create table public.auth_login_attempts (
  id           bigint generated always as identity primary key,
  key_hash     text not null check (char_length(key_hash) <= 128),
  attempted_at timestamptz not null default now()
);

create index auth_login_attempts_key_idx on public.auth_login_attempts (key_hash, attempted_at desc);

create or replace function public.register_login_attempt(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.auth_login_attempts where attempted_at < now() - interval '1 day';

  select count(*) into v_count
  from public.auth_login_attempts
  where key_hash = p_key
    and attempted_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return false;
  end if;

  insert into public.auth_login_attempts (key_hash) values (p_key);
  return true;
end;
$$;

create or replace function public.clear_login_attempts(p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.auth_login_attempts where key_hash = p_key;
$$;

-- ---------------------------------------------------------------------------
-- Scheduled publishing (service role only)
-- ---------------------------------------------------------------------------

create or replace function public.publish_due_articles()
returns table (id uuid, slug text, category_slug text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    update public.articles a
       set status = 'published'
     where a.status = 'scheduled'
       and a.deleted_at is null
       and a.published_at <= now()
    returning a.id, a.slug, a.category_slug;
end;
$$;

-- Slugs of articles imported from MDX files. The public site hides the MDX
-- file version of these, so the database copy (published or not) is the
-- single source of truth after import. These slugs were already public.
create or replace function public.mdx_import_slugs()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select slug from public.articles where source_type = 'mdx-import';
$$;

-- ---------------------------------------------------------------------------
-- Privileges (least privilege; RLS below restricts rows further)
-- ---------------------------------------------------------------------------

revoke all on table
  public.admin_users, public.categories, public.authors, public.articles,
  public.article_revisions, public.media, public.article_previews, public.auth_login_attempts
from anon, authenticated;

grant select on public.admin_users to authenticated;

grant select on public.categories, public.authors to anon, authenticated;
grant insert, update, delete on public.categories, public.authors to authenticated;

-- Public columns only: review_notes, editorial_notes, created_by and updated_by stay private.
grant select (
  id, slug, title, subtitle, excerpt, body,
  featured_image_url, featured_image_alt, featured_image_width, featured_image_height, featured_image_credit,
  category_slug, author_slug, tags, seo_title, seo_description, canonical_url,
  status, published_at, first_published_at, updated_on, featured, sources,
  fact_check_status, reviewed_by, reviewed_on, reading_minutes, word_count, source_type,
  search_vector, created_at, updated_at, deleted_at
) on public.articles to anon;
grant select, insert, update, delete on public.articles to authenticated;

grant select on public.article_revisions to authenticated;
grant select, insert, update, delete on public.media to authenticated;
grant select, insert, delete on public.article_previews to authenticated;

revoke execute on function
  public.is_admin(),
  public.register_login_attempt(text, integer, integer),
  public.clear_login_attempts(text),
  public.publish_due_articles(),
  public.mdx_import_slugs()
from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.mdx_import_slugs() to anon, authenticated;
grant execute on function
  public.register_login_attempt(text, integer, integer),
  public.clear_login_attempts(text),
  public.publish_due_articles()
to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.authors enable row level security;
alter table public.articles enable row level security;
alter table public.article_revisions enable row level security;
alter table public.media enable row level security;
alter table public.article_previews enable row level security;
alter table public.auth_login_attempts enable row level security;

-- admin_users: a signed-in user may see only their own row. No write policies.
create policy "Users can read their own admin record"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

-- categories
create policy "Anyone can read categories"
  on public.categories for select to anon, authenticated
  using (true);
create policy "Admins can create categories"
  on public.categories for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins can update categories"
  on public.categories for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete categories"
  on public.categories for delete to authenticated
  using ((select public.is_admin()));

-- authors
create policy "Anyone can read authors"
  on public.authors for select to anon, authenticated
  using (true);
create policy "Admins can create authors"
  on public.authors for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins can update authors"
  on public.authors for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete authors"
  on public.authors for delete to authenticated
  using ((select public.is_admin()));

-- articles
create policy "Public can read published articles"
  on public.articles for select to anon
  using (status = 'published' and deleted_at is null and published_at <= now());
create policy "Admins can read all articles"
  on public.articles for select to authenticated
  using ((select public.is_admin()));
create policy "Admins can create articles"
  on public.articles for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins can update articles"
  on public.articles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete articles"
  on public.articles for delete to authenticated
  using ((select public.is_admin()));

-- article_revisions: read-only for admins; rows come from the trigger.
create policy "Admins can read revisions"
  on public.article_revisions for select to authenticated
  using ((select public.is_admin()));

-- media
create policy "Admins can read media"
  on public.media for select to authenticated
  using ((select public.is_admin()));
create policy "Admins can create media"
  on public.media for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins can update media"
  on public.media for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete media"
  on public.media for delete to authenticated
  using ((select public.is_admin()));

-- article_previews
create policy "Admins can read unexpired previews"
  on public.article_previews for select to authenticated
  using ((select public.is_admin()) and expires_at > now());
create policy "Admins can create their own previews"
  on public.article_previews for insert to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()));
create policy "Admins can delete previews"
  on public.article_previews for delete to authenticated
  using ((select public.is_admin()));

-- auth_login_attempts: no policies. Only the security-definer functions above touch it.

-- ---------------------------------------------------------------------------
-- Storage: public bucket for article images, admin-only writes
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can list article images"
  on storage.objects for select to authenticated
  using (bucket_id = 'article-images' and (select public.is_admin()));
create policy "Admins can upload article images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'article-images' and (select public.is_admin()));
create policy "Admins can update article images"
  on storage.objects for update to authenticated
  using (bucket_id = 'article-images' and (select public.is_admin()))
  with check (bucket_id = 'article-images' and (select public.is_admin()));
create policy "Admins can delete article images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'article-images' and (select public.is_admin()));
