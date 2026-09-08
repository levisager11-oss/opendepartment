-- ===========================================================================
--  Supabase shim -- ONLY for running db/test/01-rls-tests.sql against a plain
--  PostgreSQL instance. Never run this in a real Supabase project: it creates
--  stand-ins for objects Supabase already provides.
--
--  It reproduces the parts of a Supabase project the tenant schema depends on,
--  and -- just as importantly -- Supabase's DEFAULT GRANTS. `anon` and
--  `authenticated` arrive holding insert/update/delete on everything in
--  `public`, which is the whole reason db/tenant-schema.sql spends effort
--  revoking column privileges back. A shim without those grants would make the
--  fences look like they work when they had nothing to fence.
-- ===========================================================================

-- Roles are cluster-wide, not per-database, so the second database to apply
-- this shim finds them already there.
do $roles$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $roles$;

grant usage on schema public to anon, authenticated, service_role;

-- --------------------------------------------------------------------- auth
create schema if not exists auth;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- Supabase reads the signed JWT out of a GUC. Tests impersonate a user by
-- setting the same GUC, so nothing here has to understand JWTs.
-- Returns null for a signed-out caller, which is what the real one does and
-- what every `= auth.uid()` policy in the tenant schema relies on. The GUC may
-- be unset OR empty depending on how the caller cleared it, so both collapse
-- to an empty object rather than reaching the JSON parser.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(
    coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::json ->> 'sub',
    ''
  )::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- ------------------------------------------------------------------ storage
create schema if not exists storage;

create table storage.buckets (
  id              text primary key,
  name            text not null,
  public          boolean not null default false,
  file_size_limit bigint
);

create table storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name      text not null,
  owner     uuid,
  metadata  jsonb,
  created_at timestamptz not null default now()
);

create or replace function storage.foldername(name text)
returns text[] language sql immutable as $$
  select string_to_array(name, '/');
$$;

alter table storage.objects enable row level security;

grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
grant execute on function storage.foldername(text) to anon, authenticated;

-- ------------------------------------------------- Supabase default grants
-- Applied to whatever public.* exists now and to anything created later, which
-- is what a real project does.
grant select, insert, update, delete on all tables    in schema public to anon, authenticated;
grant usage,  select                 on all sequences in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
