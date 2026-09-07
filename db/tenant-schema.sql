-- ===========================================================================
--  OPENDEPARTMENT -- tenant schema
--
--  This runs ONCE inside the *department owner's own* Supabase project.
--  Paste it into Dashboard -> SQL Editor -> New query -> Run.
--  Safe to re-run: everything is idempotent.
--
--  DESIGN RULE: OpenDepartment never receives your service_role key. Every
--  privileged operation an administrator needs is a `security definer`
--  function below, gated on is_admin(). The hosted app only ever holds your
--  project URL and your anon/publishable key -- both public by design and
--  useless without a signed-in, admitted account.
-- ===========================================================================

-- No `create extension` here, on purpose. Everything below needs only
-- gen_random_uuid(), which has been core Postgres since 13. And CREATE
-- EXTENSION is one of the few statements a read-only or otherwise restricted
-- SQL session refuses outright -- `if not exists` included, because the
-- read-only check runs before the does-it-already-exist check -- so a
-- pointless one would be the first thing to fail on a paste-and-run.

-- ---------------------------------------------------------------------------
-- 0. SETTINGS -- one row. This is what makes a department "yours": the name,
--    the noun the files are about, the docket prefix, the palette.
--    "Lorenzo" lives here as data, never as code.
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id              boolean primary key default true check (id),
  department_name text    not null default 'The Department',
  tagline         text,
  -- What the archive is about. Renders as "The <subject_label> Files".
  subject_label   text    not null default 'Case',
  -- Docket prefix: 'LF' renders case numbers as LF-0001.
  docket_prefix   text    not null default 'CF',
  seal_top        text    not null default 'DEPARTMENT OF RECORDS',
  seal_bottom     text    not null default 'OFFICIAL USE ONLY',
  accent          text    not null default '#b8860b',
  categories      text[]  not null default array[
                    'EXHIBIT','WITNESS STATEMENT','SURVEILLANCE',
                    'MEMORANDUM','TRANSCRIPT','CORRESPONDENCE','MISCELLANEOUS'],
  max_upload_mb   integer not null default 25,
  -- Operator identity. Whoever runs this department is responsible for it.
  operator_name    text,
  operator_contact text,
  claimed          boolean not null default false,
  -- The door. false: an invite code is required to sign up. true: the
  -- department is public and anybody may create an account. Enforced by
  -- handle_new_user() below rather than by the app, so a hand-rolled API
  -- call cannot get in where the sign-up form would have refused.
  open_join        boolean not null default false,
  created_at       timestamptz not null default now()
);

insert into public.settings (id) values (true) on conflict (id) do nothing;

-- A department created before open_join existed has a settings table without
-- it, and the `if not exists` above leaves such a table alone. Re-running this
-- file is the supported way to pick up a schema change, so add the column
-- here too. The default keeps an existing department invite-only until its
-- administrator decides otherwise.
alter table public.settings
  add column if not exists open_join boolean not null default false;

-- ---------------------------------------------------------------------------
-- Value constraints on the settings row.
--
-- These used to live only in the administration screen, which meant they were
-- advice: `settings` is admin-writable, and a hand-rolled PostgREST call skips
-- the form entirely. `accent` in particular is substituted into real CSS
-- (`background: var(--accent)`), so a value carrying a semicolon reparses into
-- extra declarations -- an administrator could inject CSS into every page of
-- their own department. Six hex digits is the only shape the app ever renders.
--
-- Existing rows are normalised FIRST. A department re-running this file may
-- already hold a value the constraint would refuse, and the ALTER would fail
-- on it rather than fixing it.
-- ---------------------------------------------------------------------------
update public.settings
   set accent = '#b8860b'
 where accent !~ '^#[0-9a-fA-F]{6}$';

update public.settings
   set max_upload_mb = least(greatest(coalesce(max_upload_mb, 25), 1), 50);

update public.settings
   set categories = array['EXHIBIT','MISCELLANEOUS']
 where categories is null or cardinality(categories) = 0;

alter table public.settings drop constraint if exists settings_accent_hex;
alter table public.settings
  add constraint settings_accent_hex check (accent ~ '^#[0-9a-fA-F]{6}$');

alter table public.settings drop constraint if exists settings_upload_range;
alter table public.settings
  add constraint settings_upload_range check (max_upload_mb between 1 and 50);

alter table public.settings drop constraint if exists settings_categories_present;
alter table public.settings
  add constraint settings_categories_present check (cardinality(categories) > 0);

-- ---------------------------------------------------------------------------
-- 1. INVITES -- the door into a department that has not opened itself up.
--    A public department (settings.open_join) lets anybody sign up without
--    one; codes still work there, because only a code can hand out
--    administrator rights.
--
-- There is deliberately no e-mail allowlist. Maintaining one means the
-- administrator has to collect and type in everybody's address before they can
-- join, which is the slowest possible way to add thirty classmates. A code you
-- paste into a group chat does the same job in one message.
-- ---------------------------------------------------------------------------
create table if not exists public.invites (
  code         text primary key,
  note         text,
  max_uses     integer,                    -- null = unlimited
  uses         integer not null default 0,
  grants_admin boolean not null default false,
  expires_at   timestamptz,
  created_by   uuid,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- What a code has to look like.
--
-- Two rules, both of which were previously only true because the admin screen
-- happened to generate codes that way -- and `invites` is admin-writable over
-- PostgREST, so "the form does it" is not a rule.
--
--   LENGTH. The generator mints nine characters out of a 32-letter alphabet,
--   which is fine. Nothing stopped an administrator typing PARTY into the
--   field instead, and a code may carry `grants_admin` -- so a guessable one
--   is not a weak password, it is an unauthenticated route to reading every
--   member's e-mail address.
--
--   CASE. handle_new_user() upper-cases the code it is handed before looking
--   it up, so a code stored in lower case can never be redeemed by anybody.
--   The screen upper-cases on the way in; the column now says so.
--
-- NOT VALID, like the constraints on `files` below: a department re-running
-- this file keeps the codes it has already handed out.
-- ---------------------------------------------------------------------------
alter table public.invites drop constraint if exists invites_code_shape;
alter table public.invites
  add constraint invites_code_shape check (
    char_length(code) between 8 and 64 and code = upper(code)
  ) not valid;

-- ---------------------------------------------------------------------------
-- 2. PROFILES -- public identity. Deliberately carries NO e-mail address, so
--    that a hand-crafted API call from a member cannot leak one.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  is_admin    boolean not null default false,
  is_banned   boolean not null default false,
  created_at  timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- 3. USER_EMAILS -- private. Owner and admins only. Split out because RLS is
--    row-level, not column-level.
create table if not exists public.user_emails (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  email    text not null
);

-- ---------------------------------------------------------------------------
-- 4. SUBJECTS -- the people or topics a file can be filed under.
--    Admin-created on purpose: letting members invent subjects named after
--    real people is how an archive turns into a harassment tool.
-- ---------------------------------------------------------------------------
create table if not exists public.subjects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  description  text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. FILES -- one row per exhibit. Vote/comment/report counters are
--    denormalised and trigger-maintained so sorting never needs an aggregate.
-- ---------------------------------------------------------------------------
do $kind$ begin
  create type public.file_kind as enum ('image', 'pdf', 'video', 'audio', 'other');
exception when duplicate_object then null; end $kind$;

create table if not exists public.files (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  description    text,
  category       text not null default 'EXHIBIT',
  storage_path   text not null unique,
  original_name  text not null,
  mime_type      text not null,
  size_bytes     bigint not null,
  kind           public.file_kind not null default 'other',
  upvotes        integer not null default 0,
  downvotes      integer not null default 0,
  score          integer not null default 0,
  comment_count  integer not null default 0,
  report_count   integer not null default 0,
  view_count     integer not null default 0,
  case_number    bigserial,
  created_at     timestamptz not null default now()
);

create index if not exists files_created_idx on public.files (created_at desc);
create index if not exists files_score_idx   on public.files (score desc, created_at desc);
create index if not exists files_owner_idx   on public.files (owner_id);

-- ---------------------------------------------------------------------------
-- What a member may claim about their own upload.
--
-- The accepted-type list lived only in the upload form, and the insert policy
-- checks who you are rather than what you filed -- so a hand-rolled call could
-- store any content type at all in the owner's bucket under the owner's name.
-- `kind` drives which viewer renders the object, so it has to agree with
-- `mime_type` rather than being a second thing the client asserts freely.
--
-- NOT VALID on purpose: this is enforced for every insert and update from here
-- on, but a department re-running this file is not asked to delete documents
-- its members filed under the old rules. Run
-- `alter table public.files validate constraint files_accepted_type;` if you
-- want the existing rows checked too.
-- ---------------------------------------------------------------------------
alter table public.files drop constraint if exists files_accepted_type;
alter table public.files
  add constraint files_accepted_type check (
    (kind = 'image' and mime_type in ('image/jpeg','image/png','image/gif',
       'image/webp','image/avif','image/heic','image/heif'))
    or (kind = 'pdf'   and mime_type = 'application/pdf')
    or (kind = 'video' and mime_type in ('video/mp4','video/webm',
       'video/quicktime','video/x-m4v'))
    or (kind = 'audio' and mime_type in ('audio/mpeg','audio/mp4','audio/x-m4a',
       'audio/wav','audio/x-wav','audio/webm','audio/ogg'))
  ) not valid;

-- size_bytes is whatever the browser said it was -- the real bytes are in
-- storage, which enforces the bucket's own limit. A lying value here only
-- distorts the "storage used" figure on the administration screen, but there
-- is no reason to accept a negative or absurd one.
alter table public.files drop constraint if exists files_size_sane;
alter table public.files
  add constraint files_size_sane
  check (size_bytes between 0 and 52428800) not valid;

alter table public.files drop constraint if exists files_text_lengths;
alter table public.files
  add constraint files_text_lengths check (
    char_length(title) between 1 and 200
    and char_length(coalesce(description, '')) <= 2000
    and char_length(original_name) between 1 and 200
    and char_length(category) <= 60
  ) not valid;

create table if not exists public.file_subjects (
  file_id     uuid not null references public.files(id) on delete cascade,
  subject_id  uuid not null references public.subjects(id) on delete cascade,
  primary key (file_id, subject_id)
);
create index if not exists file_subjects_subject_idx on public.file_subjects (subject_id);

-- 6. VOTES -- one row per (file, user); +1 or -1.
create table if not exists public.votes (
  file_id   uuid not null references public.files(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  value     smallint not null check (value in (-1, 1)),
  voted_at  timestamptz not null default now(),
  primary key (file_id, user_id)
);

-- 7. COMMENTS
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  file_id     uuid not null references public.files(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists comments_file_idx on public.comments (file_id, created_at);

-- 8. REPORTS -- the notice-and-takedown trail. Admin-visible only.
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  file_id      uuid references public.files(id) on delete cascade,
  comment_id   uuid references public.comments(id) on delete cascade,
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  reason       text not null,
  details      text,
  status       text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles(id) on delete set null
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- One report per person per file. The report dialog has always had a "you
-- already sent this" branch and a string to go with it; there was simply
-- nothing that could ever raise it, so the same person could file the same
-- complaint until the admin queue was useless. Older reports are collapsed
-- first, keeping the earliest of each pair, because a department re-running
-- this file may already have duplicates and the index would refuse to build
-- over them. Partial, because a comment report carries no file_id.
delete from public.reports r
 where r.file_id is not null
   and exists (
     select 1 from public.reports keep
      where keep.file_id     = r.file_id
        and keep.reporter_id = r.reporter_id
        and (keep.created_at, keep.id) < (r.created_at, r.id)
   );

create unique index if not exists reports_one_per_file_idx
  on public.reports (file_id, reporter_id) where file_id is not null;

-- The report dialog offers six reasons and nothing else, so the column should
-- say so: free text here is an unbounded write into the admin queue. NOT VALID
-- for the same reason as `files` above -- reports already filed are left alone.
alter table public.reports drop constraint if exists reports_known_reason;
alter table public.reports
  add constraint reports_known_reason check (
    reason in ('illegal','personal','copyright','sexual','harassment','other')
    and char_length(coalesce(details, '')) <= 2000
  ) not valid;

-- 9. AUDIT LOG -- every deletion and moderation action is recorded.
create table if not exists public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target      text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_created_idx on public.audit_log (created_at desc);

-- ===========================================================================
--  HELPERS
-- ===========================================================================

-- A ban has to reach administrators too.
--
-- This used to read `is_admin` alone, which meant banning a rogue
-- administrator took away the interface and nothing else: requireMember() in
-- the app sends them to /access-denied, but the department's anon key and
-- their still-valid session are all it takes to call the RPCs directly. A
-- banned administrator could go on reading every member's e-mail address
-- through admin_list_members(), deleting other people's documents, and
-- banning whoever had just banned them.
--
-- Banning is the only lever an administrator has against another
-- administrator that does not depend on the other one cooperating, so it has
-- to be the one that lands. `and not is_banned` is the whole fix; every
-- privileged path already routes through this function.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce(
    (select p.is_admin and not p.is_banned
       from public.profiles p where p.id = auth.uid()),
    false);
$fn$;

create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce((select not is_banned from public.profiles where id = auth.uid()), false);
$fn$;

-- ---------------------------------------------------------------------------
-- New-user hook. Runs for e-mail/password AND OAuth signups, because both
-- INSERT into auth.users. Rejecting here cannot be bypassed from the client.
--
-- Three ways in:
--   1. Nobody has claimed the department yet -> this user founds it as admin.
--   2. The department is public (settings.open_join) -> no code needed.
--   3. They presented a valid invite code.
--
-- A code still counts in a public department: granting administrator rights
-- is the one thing no open door can do, so a presented code is redeemed --
-- and checked -- whether the door is open or shut.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  clean_email text := lower(trim(new.email));
  unclaimed   boolean;
  open_door   boolean;
  want_code   text;
  inv         public.invites%rowtype;
  make_admin  boolean := false;
begin
  -- FOR UPDATE for the same reason the invite lookup below has it: two people
  -- signing up in the same instant both read `claimed = false` and both found
  -- the department, and the second administrator is one nobody chose. The lock
  -- makes the loser of the race read the row the winner already claimed.
  select not s.claimed, s.open_join
    into unclaimed, open_door
    from public.settings s where s.id for update;

  if unclaimed then
    -- The first account through the door founds the department.
    make_admin := true;
    update public.settings set claimed = true where id;

  else
    -- Named want_code, not code: `code` is also a column on public.invites,
    -- and plpgsql refuses an ambiguous reference inside the lookup below.
    want_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));

    if want_code = '' then
      -- Nothing to check when the department is public. When it is not, this
      -- is where a stranger is turned away. Written against coalesce so that
      -- a settings row that somehow went missing fails shut: `not null` is
      -- null, which would have waved everybody through.
      if not coalesce(open_door, false) then
        raise exception 'DEPT_NO_INVITE'
          using hint = 'An invite code is required to join this department.';
      end if;

    else
      -- FOR UPDATE so two people redeeming the last use of a code cannot both
      -- pass the check.
      select * into inv from public.invites i where i.code = want_code for update;

      if inv.code is null then
        raise exception 'DEPT_BAD_INVITE' using hint = 'That invite code is not valid.';
      end if;
      if inv.expires_at is not null and inv.expires_at < now() then
        raise exception 'DEPT_INVITE_EXPIRED' using hint = 'That invite code has expired.';
      end if;
      if inv.max_uses is not null and inv.uses >= inv.max_uses then
        raise exception 'DEPT_INVITE_USED' using hint = 'That invite code has been used up.';
      end if;

      update public.invites i set uses = i.uses + 1 where i.code = inv.code;
      make_admin := inv.grants_admin;
    end if;
  end if;

  insert into public.profiles (id, is_admin) values (new.id, make_admin)
  on conflict (id) do nothing;

  insert into public.user_emails (user_id, email) values (new.id, clean_email)
  on conflict (user_id) do update set email = excluded.email;

  return new;
end; $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Counter triggers
-- ---------------------------------------------------------------------------
create or replace function public.refresh_file_votes()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare target uuid := coalesce(new.file_id, old.file_id);
begin
  update public.files f set
    upvotes   = (select count(*) from public.votes v where v.file_id = target and v.value = 1),
    downvotes = (select count(*) from public.votes v where v.file_id = target and v.value = -1),
    score     = (select coalesce(sum(v.value), 0) from public.votes v where v.file_id = target)
  where f.id = target;
  return null;
end; $fn$;

drop trigger if exists votes_changed on public.votes;
create trigger votes_changed after insert or update or delete on public.votes
  for each row execute function public.refresh_file_votes();

create or replace function public.refresh_file_comments()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare target uuid := coalesce(new.file_id, old.file_id);
begin
  update public.files f
     set comment_count = (select count(*) from public.comments c where c.file_id = target)
   where f.id = target;
  return null;
end; $fn$;

drop trigger if exists comments_changed on public.comments;
create trigger comments_changed after insert or delete on public.comments
  for each row execute function public.refresh_file_comments();

create or replace function public.refresh_file_reports()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare target uuid := coalesce(new.file_id, old.file_id);
begin
  if target is null then return null; end if;
  update public.files f
     set report_count = (select count(*) from public.reports r
                          where r.file_id = target and r.status = 'open')
   where f.id = target;
  return null;
end; $fn$;

drop trigger if exists reports_changed on public.reports;
create trigger reports_changed after insert or update or delete on public.reports
  for each row execute function public.refresh_file_reports();

-- ===========================================================================
--  MEMBER RPCs
-- ===========================================================================

-- Every other function on this page re-checks something before it writes.
-- This one did not, and Postgres grants EXECUTE to PUBLIC by default -- so the
-- department's anon key, which is in the page source of its own front door,
-- was enough to drive unbounded writes into the owner's database. The
-- membership check is what every other member RPC already does; the revoke is
-- what stops a signed-out caller reaching it at all.
create or replace function public.increment_view(target uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_active_member() then return; end if;
  update public.files set view_count = view_count + 1 where id = target;
end; $fn$;

revoke execute on function public.increment_view(uuid) from anon, public;
grant  execute on function public.increment_view(uuid) to authenticated;

create or replace function public.cast_vote(target uuid, new_value smallint)
returns table (upvotes int, downvotes int, score int, my_vote int)
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_active_member() then raise exception 'NOT_A_MEMBER'; end if;

  if new_value = 0 then
    delete from public.votes v where v.file_id = target and v.user_id = auth.uid();
  elsif new_value in (-1, 1) then
    insert into public.votes (file_id, user_id, value) values (target, auth.uid(), new_value)
    on conflict (file_id, user_id) do update set value = excluded.value, voted_at = now();
  else
    raise exception 'INVALID_VOTE';
  end if;

  return query
    select f.upvotes, f.downvotes, f.score,
           coalesce((select v.value from public.votes v
                      where v.file_id = target and v.user_id = auth.uid()), 0)::int
      from public.files f where f.id = target;
end; $fn$;

create or replace function public.claim_username(desired text)
returns text language plpgsql security definer set search_path = public as $fn$
declare clean text := trim(desired);
begin
  -- Every other member RPC checks this. Without it a banned member could go on
  -- renaming themselves -- and the name is the one thing of theirs that the
  -- members who can still read the archive see.
  if not public.is_active_member() then raise exception 'NOT_A_MEMBER'; end if;
  if clean !~ '^[A-Za-z0-9_-]{3,20}$' then raise exception 'USERNAME_INVALID'; end if;
  if exists (select 1 from public.profiles p
              where lower(p.username) = lower(clean) and p.id <> auth.uid()) then
    raise exception 'USERNAME_TAKEN';
  end if;
  update public.profiles set username = clean where id = auth.uid();
  return clean;
end; $fn$;

-- ===========================================================================
--  ADMIN RPCs -- these exist so that OpenDepartment never needs your
--  service_role key. Each one re-checks is_admin() itself.
-- ===========================================================================

create or replace function public.admin_list_members()
returns table (id uuid, username text, is_admin boolean, is_banned boolean,
               created_at timestamptz, email text, file_count bigint)
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  return query
    select p.id, p.username, p.is_admin, p.is_banned, p.created_at, e.email,
           (select count(*) from public.files f where f.owner_id = p.id)
      from public.profiles p
      left join public.user_emails e on e.user_id = p.id
     order by p.created_at;
end; $fn$;

create or replace function public.admin_file_owner_email(target uuid)
returns text language plpgsql security definer set search_path = public as $fn$
declare addr text;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  select e.email into addr
    from public.files f join public.user_emails e on e.user_id = f.owner_id
   where f.id = target;
  return addr;
end; $fn$;

-- Deletes the row and returns the storage path so the caller can remove the
-- object too. Storage RLS already lets an admin delete, so no elevated key.
create or replace function public.delete_file(target uuid, why text default null)
returns text language plpgsql security definer set search_path = public as $fn$
declare path text; owner uuid;
begin
  select f.storage_path, f.owner_id into path, owner from public.files f where f.id = target;
  if path is null then raise exception 'NOT_FOUND'; end if;

  if not (public.is_admin() or owner = auth.uid()) then
    raise exception 'NOT_ALLOWED';
  end if;

  insert into public.audit_log (actor_id, action, target, detail)
  values (auth.uid(), 'file.delete', target::text,
          jsonb_build_object('storage_path', path, 'reason', why));

  delete from public.files where id = target;
  return path;
end; $fn$;

create or replace function public.admin_set_flag(target uuid, flag text, value boolean)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if target = auth.uid() then raise exception 'CANNOT_CHANGE_SELF'; end if;

  if flag = 'is_admin' then
    update public.profiles set is_admin = value where id = target;
  elsif flag = 'is_banned' then
    update public.profiles set is_banned = value where id = target;
  else
    raise exception 'UNKNOWN_FLAG';
  end if;

  insert into public.audit_log (actor_id, action, target, detail)
  values (auth.uid(), 'member.' || flag, target::text, jsonb_build_object('value', value));
end; $fn$;

-- Counters for the department's front door. Returns only totals -- never
-- titles, never names.
create or replace function public.department_stats()
returns table (files bigint, members bigint, subjects bigint)
language sql security definer set search_path = public as $fn$
  select (select count(*) from public.files),
         (select count(*) from public.profiles),
         (select count(*) from public.subjects);
$fn$;

-- The one thing the hosted app reads without any session: how to render the
-- department's front door. Nothing here is private.
-- Dropped first because the column list grew: `create or replace` refuses to
-- change a set-returning function's result type, so without this a re-run
-- would fail on a department that installed an earlier version of this file.
-- The grant below re-applies what the drop takes away.
-- operator_name and operator_contact are on the list because a department's
-- own imprint has to render for somebody who is not a member -- that is the
-- whole point of an imprint. They are the address the department already
-- publishes in its footer, not a member's.
drop function if exists public.department_identity();
create or replace function public.department_identity()
returns table (department_name text, tagline text, subject_label text,
               docket_prefix text, seal_top text, seal_bottom text,
               accent text, categories text[],
               max_upload_mb integer, claimed boolean, open_join boolean,
               operator_name text, operator_contact text)
language sql security definer set search_path = public as $fn$
  select s.department_name, s.tagline, s.subject_label, s.docket_prefix,
         s.seal_top, s.seal_bottom, s.accent, s.categories,
         s.max_upload_mb, s.claimed, s.open_join,
         s.operator_name, s.operator_contact
    from public.settings s where s.id;
$fn$;

grant execute on function public.department_identity() to anon, authenticated;
grant execute on function public.department_stats()    to anon, authenticated;

-- ===========================================================================
--  ROW LEVEL SECURITY
-- ===========================================================================
alter table public.settings      enable row level security;
alter table public.invites       enable row level security;
alter table public.profiles      enable row level security;
alter table public.user_emails   enable row level security;
alter table public.subjects      enable row level security;
alter table public.files         enable row level security;
alter table public.file_subjects enable row level security;
alter table public.votes         enable row level security;
alter table public.comments      enable row level security;
alter table public.reports       enable row level security;
alter table public.audit_log     enable row level security;

-- SETTINGS: members read, admins write. Anonymous visitors go through
-- department_identity() instead, which is security definer.
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings
  for select to authenticated using (true);

drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Same column-level reasoning as `profiles` and `files` below, and this table
-- is the one that needed it most. `claimed` lives on this row: an
-- administrator who set it back to false made handle_new_user() treat the very
-- next signup as the one that founds the department -- no invite code, instant
-- administrator. That is a backdoor which survives being demoted, and it opens
-- a closed department on the way past.
--
-- What is left is presentation: the words, the palette and the door, which are
-- an administrator's to change. `claimed` and `created_at` are not.
revoke update on public.settings from anon, authenticated;
grant  update (department_name, tagline, subject_label, docket_prefix,
               seal_top, seal_bottom, accent, categories, max_upload_mb,
               operator_name, operator_contact, open_join)
  on public.settings to authenticated;

-- INVITES: admins only. The signup trigger reads them as security definer.
drop policy if exists invites_admin_all on public.invites;
create policy invites_admin_all on public.invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- PROFILES
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Row level security is exactly that: ROW level. A policy that says "your own
-- row" says nothing about WHICH COLUMNS of it, and Supabase grants the
-- `authenticated` role update on every column of every table in `public` by
-- default -- so profiles_update_self above, on its own, let any member run
--
--     update profiles set is_admin = true where id = auth.uid()
--
-- and promote themselves, or clear their own is_banned and walk back in.
-- Column privileges are the part of the grant system that is column-level, so
-- the flags are taken away here and only the cover name is handed back.
-- admin_set_flag() and claim_username() are `security definer` and run as the
-- owner, so both keep working untouched.
revoke update on public.profiles from anon, authenticated;
grant  update (username) on public.profiles to authenticated;

-- USER_EMAILS: yourself, or an admin. Nobody else, ever.
drop policy if exists emails_read_own on public.user_emails;
create policy emails_read_own on public.user_emails
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists emails_admin_write on public.user_emails;
create policy emails_admin_write on public.user_emails
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- SUBJECTS
drop policy if exists subjects_read on public.subjects;
create policy subjects_read on public.subjects
  for select to authenticated using (true);

drop policy if exists subjects_admin_write on public.subjects;
create policy subjects_admin_write on public.subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- FILES
drop policy if exists files_read on public.files;
create policy files_read on public.files
  for select to authenticated using (public.is_active_member());

drop policy if exists files_insert_own on public.files;
create policy files_insert_own on public.files
  for insert to authenticated with check (owner_id = auth.uid() and public.is_active_member());

-- is_active_member() here for the same reason it is on the insert policy above.
-- Ownership alone said a banned member may still retitle and recategorise the
-- documents they filed before they were banned -- they cannot read them any
-- more, but they could still rewrite them blind.
drop policy if exists files_update_own on public.files;
create policy files_update_own on public.files
  for update to authenticated
  using (owner_id = auth.uid() and public.is_active_member())
  with check (owner_id = auth.uid() and public.is_active_member());

drop policy if exists files_delete_own_or_admin on public.files;
create policy files_delete_own_or_admin on public.files
  for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- Same column-level reasoning as `profiles` above. Everything on this table
-- past the three descriptive fields is a counter maintained by a trigger, and
-- "you may update your own row" would otherwise mean "you may set your own
-- score to 9999". The counter triggers and increment_view() are
-- `security definer`, so they still write whatever they like.
revoke update on public.files from anon, authenticated;
grant  update (title, description, category) on public.files to authenticated;

-- FILE_SUBJECTS
drop policy if exists fs_read on public.file_subjects;
create policy fs_read on public.file_subjects
  for select to authenticated using (true);

drop policy if exists fs_write on public.file_subjects;
create policy fs_write on public.file_subjects
  for all to authenticated
  using (exists (select 1 from public.files f
                  where f.id = file_id and (f.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.files f
                  where f.id = file_id and (f.owner_id = auth.uid() or public.is_admin())));

-- VOTES: you only ever see your own row. Totals come from the counters on
-- `files`, so nobody can reconstruct who voted which way.
-- Reading your own row stays open to anyone signed in, so a ban does not make
-- the vote buttons render wrong. Writing is gated: cast_vote() already refuses
-- a banned member, and this closes the direct-table path it left open.
drop policy if exists votes_own on public.votes;
create policy votes_own on public.votes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists votes_write_own on public.votes;
create policy votes_write_own on public.votes
  for all to authenticated
  using (user_id = auth.uid() and public.is_active_member())
  with check (user_id = auth.uid() and public.is_active_member());

-- COMMENTS
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments
  for select to authenticated using (public.is_active_member());

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments
  for insert to authenticated with check (author_id = auth.uid() and public.is_active_member());

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- REPORTS
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and public.is_active_member());

drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists reports_admin_write on public.reports;
create policy reports_admin_write on public.reports
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- AUDIT LOG
drop policy if exists audit_admin on public.audit_log;
create policy audit_admin on public.audit_log
  for select to authenticated using (public.is_admin());

-- ===========================================================================
--  VIEW: everything the archive list needs, with usernames but never e-mails.
--  security_invoker = true keeps the caller's RLS on `files` in force.
-- ===========================================================================
drop view if exists public.files_public;
create view public.files_public
with (security_invoker = true) as
select
  f.id, f.title, f.description, f.category, f.kind, f.mime_type,
  f.size_bytes, f.original_name, f.storage_path,
  f.upvotes, f.downvotes, f.score, f.comment_count, f.view_count,
  f.case_number, f.created_at, f.owner_id,
  p.username as owner_username,
  coalesce(
    (select json_agg(json_build_object('id', s.id, 'name', s.name) order by s.name)
       from public.file_subjects fs
       join public.subjects s on s.id = fs.subject_id
      where fs.file_id = f.id),
    '[]'::json
  ) as subjects
from public.files f
join public.profiles p on p.id = f.owner_id;

grant select on public.files_public to authenticated;

-- ===========================================================================
--  STORAGE -- private bucket. Downloads only ever happen through short-lived
--  signed URLs, which a member's own anon-key session is allowed to mint.
-- ===========================================================================
-- The bucket's ceiling is derived from settings.max_upload_mb rather than
-- frozen at 25. Storage checks file_size_limit before RLS or anything in the
-- app gets a say, so a hardcoded number meant raising the cap on the
-- administration screen produced uploads the browser waved through for storage
-- to reject with nothing useful to say about why.
insert into storage.buckets (id, name, public, file_size_limit)
values ('department-files', 'department-files', false,
        (select max_upload_mb from public.settings where id) * 1024 * 1024)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

-- ...and it keeps following the setting. Without this the two drift apart the
-- first time an administrator changes the cap.
--
-- Wrapped in an exception handler because storage.buckets belongs to
-- supabase_storage_admin: on a project where this function's owner cannot
-- write it, a rebrand should still save rather than failing on the sync.
create or replace function public.sync_bucket_limit()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  begin
    update storage.buckets
       set file_size_limit = new.max_upload_mb * 1024 * 1024
     where id = 'department-files';
  exception when others then
    raise warning 'could not resize department-files bucket: %', sqlerrm;
  end;
  return null;
end; $fn$;

revoke execute on function public.sync_bucket_limit() from anon, authenticated, public;

drop trigger if exists settings_upload_cap_changed on public.settings;
create trigger settings_upload_cap_changed
  after update of max_upload_mb on public.settings
  for each row when (new.max_upload_mb is distinct from old.max_upload_mb)
  execute function public.sync_bucket_limit();

drop policy if exists "dept upload own folder" on storage.objects;
create policy "dept upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'department-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_member()
  );

drop policy if exists "dept read members" on storage.objects;
create policy "dept read members" on storage.objects
  for select to authenticated
  using (bucket_id = 'department-files' and public.is_active_member());

drop policy if exists "dept delete own or admin" on storage.objects;
create policy "dept delete own or admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'department-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ===========================================================================
--  DONE. Go back to OpenDepartment and finish connecting your project.
--  The FIRST account that signs up becomes the administrator -- make sure
--  that is you.
-- ===========================================================================
