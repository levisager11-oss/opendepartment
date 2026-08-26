-- ===========================================================================
--  OPENDEPARTMENT -- control plane
--
--  This runs in the ONE Supabase project that OpenDepartment itself owns.
--  It is a directory, nothing more: it maps a slug to somebody else's
--  Supabase project and remembers who registered it.
--
--  What is deliberately NOT here: files, comments, votes, member e-mail
--  addresses, department content of any kind. All of that lives in the
--  department owner's own project. This table holds a URL, a public anon key
--  and a name -- which is why hosting a thousand departments costs about as
--  much as hosting none.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- Registrant accounts are just Supabase auth users in this project. A person
-- needs one only to CREATE or MANAGE a department. Members of a department
-- never touch the control plane at all -- they sign in against the
-- department's own project.
create table if not exists public.operators (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_operator()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.operators (id) values (new.id) on conflict (id) do nothing;
  return new;
end; $fn$;

drop trigger if exists on_operator_created on auth.users;
create trigger on_operator_created
  after insert on auth.users
  for each row execute function public.handle_new_operator();

-- A trigger body, not an API. Postgres refuses to call it directly anyway, but
-- it should not be listed on /rest/v1/rpc either.
revoke execute on function public.handle_new_operator() from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- DEPARTMENTS -- the directory itself.
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  slug           text primary key
                   check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'),
  operator_id    uuid not null references public.operators(id) on delete cascade,

  -- Where this department's data actually lives. Both values are public by
  -- design: the anon key is meaningless without an account that the
  -- department's own RLS admits.
  supabase_url   text not null check (supabase_url ~ '^https://[a-z0-9-]+\.supabase\.(co|in)$'),
  anon_key       text not null,

  -- Cached from the tenant's settings row so the directory can render without
  -- a round trip. Refreshed on demand; the tenant's own value always wins.
  display_name   text not null default 'Untitled Department',
  tagline        text,

  -- 'unlisted' = reachable only if you know the URL (the default, and the
  --              right answer for a class or a friend group)
  -- 'public'   = appears in the public directory
  visibility     text not null default 'unlisted'
                   check (visibility in ('unlisted', 'public')),

  -- Set by OpenDepartment staff in response to an abuse report. A suspended
  -- department stops resolving here; its data is untouched and still fully
  -- under its owner's control in their own Supabase project.
  status         text not null default 'active'
                   check (status in ('active', 'suspended')),
  suspended_note text,

  verified_at    timestamptz,   -- last time we confirmed the schema is installed
  created_at     timestamptz not null default now()
);

create index if not exists departments_operator_idx on public.departments (operator_id);
create index if not exists departments_public_idx
  on public.departments (created_at desc) where visibility = 'public' and status = 'active';

-- Slugs that must never be handed out, because they collide with app routes
-- or invite impersonation.
-- RLS on with no policy is deliberate here: deny-all. Nothing reads this over
-- the API; slug_available() consults it as SECURITY DEFINER.
create table if not exists public.reserved_slugs (slug text primary key);
insert into public.reserved_slugs (slug) values
  ('new'), ('api'), ('auth'), ('admin'), ('login'), ('logout'), ('signup'),
  ('directory'), ('about'), ('legal'), ('terms'), ('privacy'), ('abuse'),
  ('help'), ('docs'), ('support'), ('settings'), ('account'), ('static'),
  ('assets'), ('public'), ('www'), ('mail'), ('opendepartment'), ('d'),
  ('test'), ('demo'), ('status'), ('blog'), ('security')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- ABUSE REPORTS -- filed against a whole department, by anyone, no account
-- required. This is the host's takedown path, distinct from the per-file
-- report feature inside a department.
-- ---------------------------------------------------------------------------
create table if not exists public.abuse_reports (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null,
  reporter_email text,
  reason       text not null,
  details      text,
  status       text not null default 'open'
                 check (status in ('open', 'resolved', 'dismissed')),
  created_at   timestamptz not null default now()
);
create index if not exists abuse_status_idx on public.abuse_reports (status, created_at desc);

-- ===========================================================================
--  RLS
-- ===========================================================================
alter table public.operators      enable row level security;
alter table public.departments    enable row level security;
alter table public.abuse_reports  enable row level security;
alter table public.reserved_slugs enable row level security;

drop policy if exists operators_self on public.operators;
create policy operators_self on public.operators
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- An operator sees and edits only their own departments.
drop policy if exists departments_own on public.departments;
create policy departments_own on public.departments
  for all to authenticated
  using (operator_id = auth.uid()) with check (operator_id = auth.uid());

-- Anyone may file an abuse report; nobody may read them back.
drop policy if exists abuse_insert on public.abuse_reports;
create policy abuse_insert on public.abuse_reports
  for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Resolution: the single read the app performs for every department page
-- load. security definer so it works for signed-out visitors without exposing
-- the departments table, and so a suspended department resolves to nothing.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_department(want text)
returns table (slug text, supabase_url text, anon_key text,
               display_name text, tagline text, visibility text)
language sql stable security definer set search_path = public as $fn$
  select d.slug, d.supabase_url, d.anon_key, d.display_name, d.tagline, d.visibility
    from public.departments d
   where d.slug = lower(trim(want)) and d.status = 'active';
$fn$;

create or replace function public.public_directory(limit_to integer default 60)
returns table (slug text, display_name text, tagline text, created_at timestamptz)
language sql stable security definer set search_path = public as $fn$
  select d.slug, d.display_name, d.tagline, d.created_at
    from public.departments d
   where d.visibility = 'public' and d.status = 'active'
   order by d.created_at desc
   limit greatest(1, least(coalesce(limit_to, 60), 200));
$fn$;

-- Slug availability, callable before an account exists.
create or replace function public.slug_available(want text)
returns boolean language sql stable security definer set search_path = public as $fn$
  select lower(trim(want)) ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'
     and not exists (select 1 from public.reserved_slugs r where r.slug = lower(trim(want)))
     and not exists (select 1 from public.departments d where d.slug = lower(trim(want)));
$fn$;

/**
 * How many departments one account may register.
 *
 * The cap is not about capacity -- each department costs us a row. It is about
 * slug squatting: without a limit, one script reserves every good address on
 * the platform overnight. Enforced here rather than in the UI, because the UI
 * is not where someone determined would be typing.
 */
create or replace function public.max_departments_per_operator()
returns integer language sql immutable set search_path = public
as $fn$ select 3; $fn$;

create or replace function public.register_department(
  want_slug text, url text, key text, name text, tag text default null,
  vis text default 'unlisted'
) returns text
language plpgsql security definer set search_path = public as $fn$
declare
  clean text := lower(trim(want_slug));
  owned integer;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;

  select count(*) into owned
    from public.departments d where d.operator_id = auth.uid();
  if owned >= public.max_departments_per_operator() then
    raise exception 'TOO_MANY_DEPARTMENTS';
  end if;

  if not public.slug_available(clean) then raise exception 'SLUG_UNAVAILABLE'; end if;

  insert into public.departments
    (slug, operator_id, supabase_url, anon_key, display_name, tagline, visibility)
  values (clean, auth.uid(), trim(url), trim(key), name, tag,
          case when vis = 'public' then 'public' else 'unlisted' end);

  return clean;

exception
  -- The check above is advisory: two people can pass it in the same instant
  -- and both reach the INSERT. `slug` is the primary key, so the loser gets a
  -- unique violation -- translated here into the same error the pre-check
  -- raises, so the caller has one case to handle rather than two.
  when unique_violation then
    raise exception 'SLUG_UNAVAILABLE';
end; $fn$;

grant execute on function public.resolve_department(text) to anon, authenticated;
grant execute on function public.public_directory(integer) to anon, authenticated;
grant execute on function public.slug_available(text)      to anon, authenticated;
grant execute on function public.register_department(text, text, text, text, text, text)
  to authenticated;
