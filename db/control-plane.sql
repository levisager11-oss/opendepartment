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

-- No `create extension` here, on purpose. Everything below needs only
-- gen_random_uuid(), which has been core Postgres since 13. And CREATE
-- EXTENSION is one of the few statements a read-only or otherwise restricted
-- SQL session refuses outright -- `if not exists` included, because the
-- read-only check runs before the does-it-already-exist check -- so a
-- pointless one would be the first thing to fail on a paste-and-run.

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

-- ---------------------------------------------------------------------------
-- The anon key is served to every visitor of /d/<slug>. It has to be a key
-- that is safe to serve.
--
-- Refusing a service_role key lived only in /api/setup/probe, and the probe is
-- not the only door into this column: register_department() is granted to
-- `authenticated` and callable straight over PostgREST, and `anon_key` is in
-- the operator's own UPDATE grant, so a registered department can be repointed
-- at a secret key afterwards without the probe ever running. Either way
-- OpenDepartment would then print a master key to that project in the page
-- source of its front door, for everybody, forever.
--
-- Same rule as everywhere else in this codebase: a check the UI performs is
-- decoration unless the database performs it too.
--
-- Supabase has two key generations and both need catching:
--   legacy   a JWT whose payload carries role "service_role"
--   current  an opaque string prefixed "sb_secret_"
--
-- Anything that does not decode is left alone rather than refused. A key we
-- cannot read is not thereby a secret one, and the probe already fails safely
-- on a key that simply does not work.
-- ---------------------------------------------------------------------------
create or replace function public.looks_like_secret_key(key text)
returns boolean language plpgsql immutable set search_path = public as $fn$
declare payload text; body text;
begin
  if key is null then return false; end if;
  if left(key, 10) = 'sb_secret_' then return true; end if;

  -- The middle segment of a JWT, base64url encoded.
  payload := split_part(key, '.', 2);
  if payload = '' then return false; end if;

  payload := translate(payload, '-_', '+/');
  payload := payload || repeat('=', (4 - length(payload) % 4) % 4);

  begin
    body := convert_from(decode(payload, 'base64'), 'utf8');
  exception when others then
    return false;    -- not a JWT payload; nothing to conclude from it
  end;

  return body ~ '"role"\s*:\s*"service_role"';
end; $fn$;

-- Callable, unlike the other internals below, because it HAS to be: the check
-- constraint under it runs as whoever is doing the UPDATE, and a role without
-- EXECUTE on the function gets "permission denied" instead of a saved row.
-- Nothing leaks by it -- it answers a question about a string the caller
-- already holds, which is the same thing the setup probe answers out loud.
grant execute on function public.looks_like_secret_key(text) to anon, authenticated;

-- NOT VALID: a directory that already holds such a row is a live incident
-- rather than something to fix by refusing to re-run this file. Every INSERT
-- and UPDATE from here on is checked. To audit the rows already there:
--
--   alter table public.departments validate constraint departments_key_not_secret;
--
alter table public.departments drop constraint if exists departments_key_not_secret;
alter table public.departments
  add constraint departments_key_not_secret
  check (not public.looks_like_secret_key(anon_key)) not valid;

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

-- Anybody may file one of these without an account, which is right for a
-- takedown path and also means the insert policy below is an open write
-- endpoint. Bounding the columns is what stops it being an open write endpoint
-- of unlimited size. Existing rows are trimmed first so a control plane
-- re-running this file is not refused by its own history.
update public.abuse_reports
   set slug           = left(slug, 40),
       reporter_email = left(reporter_email, 160),
       reason         = left(reason, 60),
       details        = left(details, 4000)
 where length(slug) > 40 or length(reporter_email) > 160
    or length(reason) > 60 or length(details) > 4000;

alter table public.abuse_reports drop constraint if exists abuse_reports_lengths;
alter table public.abuse_reports
  add constraint abuse_reports_lengths check (
    char_length(slug)                       between 1 and 40
    and char_length(coalesce(reporter_email, '')) <= 160
    and char_length(reason)                 between 1 and 60
    and char_length(coalesce(details, ''))  <= 4000
  );

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

-- An operator sees and edits only their own departments -- but "edits" has to
-- be spelled out, because a single `for all` policy here handed away three
-- things the platform is supposed to keep:
--
--   INSERT  register_department() enforces the per-account cap and the
--           reserved-slug list. A blanket insert policy let a script skip the
--           function and write rows straight into the directory, so the cap
--           was advice rather than a rule. There is no insert policy below:
--           the function is `security definer` and owns the table, so it is
--           now the only way in.
--   UPDATE  `status` lives on this row. An operator whose department had just
--           been suspended could set it back to 'active' -- and could rename
--           the slug past the reserved list while they were there. RLS is
--           row-level, so the columns are fenced off with column privileges
--           instead; what is left is presentation and their own project's
--           coordinates, which are theirs to change.
--   DELETE  delisting a suspended department and registering the slug afresh
--           walked straight back out of a suspension, so that one case is
--           excluded.
drop policy if exists departments_own on public.departments;

drop policy if exists departments_read_own on public.departments;
create policy departments_read_own on public.departments
  for select to authenticated using (operator_id = auth.uid());

drop policy if exists departments_update_own on public.departments;
create policy departments_update_own on public.departments
  for update to authenticated
  using (operator_id = auth.uid()) with check (operator_id = auth.uid());

drop policy if exists departments_delete_own on public.departments;
create policy departments_delete_own on public.departments
  for delete to authenticated
  using (operator_id = auth.uid() and status <> 'suspended');

revoke insert, update on public.departments from anon, authenticated;
grant  update (display_name, tagline, visibility, supabase_url, anon_key)
  on public.departments to authenticated;

-- Nobody may read abuse reports back, and nobody INSERTs into this table
-- directly any more.
--
-- `with check (true)` for anon is an unauthenticated write endpoint, and the
-- length constraints above only bound how big each row is -- not how many.
-- One script fills the control plane's free tier with reports about nothing,
-- and the platform's only takedown path is buried under them.
--
-- Same shape as register_department(): no insert policy at all, and one
-- `security definer` function that is the only door. What it adds is what a
-- policy cannot express -- the slug has to be a real department, and a
-- department can only have so many open complaints at once.
drop policy if exists abuse_insert on public.abuse_reports;

/**
 * File a complaint about a whole department.
 *
 * No account, on purpose: the person who needs this is a stranger who has
 * just been shown something about themselves, and asking them to register
 * first is asking them not to bother.
 *
 * Two bounds instead of an account. A report has to name a department that
 * actually resolves -- so the table cannot be filled with rows about slugs
 * that were never taken -- and a department can hold only so many OPEN
 * reports at once. The cap is not a limit on how much wrong one department can
 * do; it is the observation that the twenty-sixth open complaint about the
 * same archive tells whoever reads these nothing the first twenty-five did
 * not, while an unbounded queue tells them nothing at all.
 *
 * Returns quietly in the duplicate case rather than raising. Whether a
 * specific complaint has already been filed is not something an anonymous
 * caller should be able to ask, and the person filing it does not care.
 */
create or replace function public.report_department(
  want_slug text, why text, detail text default null,
  contact text default null
) returns void
language plpgsql security definer set search_path = public as $fn$
declare clean text := lower(trim(want_slug)); open_count integer;
begin
  if not exists (
    select 1 from public.departments d where d.slug = clean
  ) then
    raise exception 'NO_SUCH_DEPARTMENT';
  end if;

  select count(*) into open_count
    from public.abuse_reports r
   where r.slug = clean and r.status = 'open';

  if open_count >= 25 then
    -- Already answered, as far as this queue is concerned.
    return;
  end if;

  -- The same person saying the same thing twice is one report.
  if contact is not null and exists (
    select 1 from public.abuse_reports r
     where r.slug = clean
       and r.reporter_email = lower(trim(contact))
       and r.reason = why
       and r.status = 'open'
  ) then
    return;
  end if;

  insert into public.abuse_reports (slug, reporter_email, reason, details)
  values (clean,
          nullif(lower(trim(coalesce(contact, ''))), ''),
          left(trim(why), 60),
          nullif(left(trim(coalesce(detail, '')), 4000), ''));
end; $fn$;

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

  -- The constraint on the column would catch this anyway; raising here gives
  -- the wizard the same named error it already knows how to explain, instead
  -- of a check-constraint violation it would have to translate.
  if public.looks_like_secret_key(trim(key)) then
    raise exception 'SECRET_KEY';
  end if;

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

-- Trigger bodies and internals, not API. PostgREST lists whatever `anon` may
-- execute, and Postgres grants EXECUTE to PUBLIC by default -- so anything not
-- meant to be called over HTTP has to say so.
revoke execute on function public.max_departments_per_operator() from anon, authenticated, public;

grant execute on function public.resolve_department(text) to anon, authenticated;
grant execute on function public.public_directory(integer) to anon, authenticated;
grant execute on function public.slug_available(text)      to anon, authenticated;
grant execute on function public.register_department(text, text, text, text, text, text)
  to authenticated;
grant execute on function public.report_department(text, text, text, text)
  to anon, authenticated;
