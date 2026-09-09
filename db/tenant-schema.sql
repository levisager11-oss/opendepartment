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

-- Initial administration is authorized by a one-use secret generated during
-- setup. Only its SHA-256 verifier reaches SQL; neither value is public tenant
-- identity. An unclaimed installation without a verifier fails closed.
create table if not exists public.department_bootstrap (
  id          boolean primary key default true check (id),
  secret_hash text not null check (secret_hash ~ '^[0-9a-f]{64}$')
);
alter table public.department_bootstrap enable row level security;
revoke all on public.department_bootstrap from anon, authenticated;

-- A department created before open_join existed has a settings table without
-- it, and the `if not exists` above leaves such a table alone. Re-running this
-- file is the supported way to pick up a schema change, so add the column
-- here too. The default keeps an existing department invite-only until its
-- administrator decides otherwise.
alter table public.settings
  add column if not exists open_join boolean not null default false;

-- How much one member may keep in the bucket, in megabytes. Null means no cap,
-- which is what every existing department gets when it re-runs this file.
--
-- The per-file limit was the only ceiling there was, so thirty members with a
-- 25 MB cap could put 750 MB into a free tier that holds one gigabyte -- and
-- one member could do it alone. The department's own administrator is the
-- person who finds out, by way of uploads that stop working for everybody.
alter table public.settings
  add column if not exists max_member_storage_mb integer;

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

update public.settings
   set max_member_storage_mb = least(greatest(max_member_storage_mb, 1), 100000)
 where max_member_storage_mb is not null;

alter table public.settings drop constraint if exists settings_member_quota_range;
alter table public.settings
  add constraint settings_member_quota_range check (
    max_member_storage_mb is null
    or max_member_storage_mb between 1 and 100000
  );

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

-- The direct profile UPDATE API must enforce the same shape as claim_username.
-- Existing legacy names remain readable; any subsequent change must be valid.
alter table public.profiles drop constraint if exists profiles_username_shape;
alter table public.profiles
  add constraint profiles_username_shape
  check (username is null or username ~ '^[A-Za-z0-9_-]{3,20}$') not valid;

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

-- The storage policy fences an upload into a folder named after the uploader,
-- but nothing said the ROW had to point at a path in that folder. A member
-- could file a row claiming somebody else's object -- and delete_file(), which
-- an owner may call on their own row, hands back the path it finds there.
-- Storage RLS would still refuse the object deletion, so this is defence in
-- depth rather than a hole; it is also one line, and it makes the two halves
-- of an upload agree by construction instead of by convention.
alter table public.files drop constraint if exists files_path_is_owners;
alter table public.files
  add constraint files_path_is_owners
  check (split_part(storage_path, '/', 1) = owner_id::text) not valid;

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

-- A report has one target. Keep legacy malformed reports available for review,
-- but refuse new targetless or ambiguous writes, including direct API inserts.
alter table public.reports drop constraint if exists reports_one_target;
alter table public.reports
  add constraint reports_one_target
  check ((file_id is not null)::integer + (comment_id is not null)::integer = 1)
  not valid;

-- Apply the same deduplication to comment reports as to file reports above.
delete from public.reports r
 where r.comment_id is not null
   and exists (
     select 1 from public.reports keep
      where keep.comment_id = r.comment_id
        and keep.reporter_id = r.reporter_id
        and (keep.created_at, keep.id) < (r.created_at, r.id)
   );
create unique index if not exists reports_one_per_comment_idx
  on public.reports (comment_id, reporter_id) where comment_id is not null;

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
--   1. Unclaimed, with the setup secret -> this user founds it as admin.
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
  want_secret text;
  expected_secret text;
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
    want_secret := coalesce(new.raw_user_meta_data ->> 'bootstrap_secret', '');
    select b.secret_hash into expected_secret
      from public.department_bootstrap b where b.id;
    if want_secret !~ '^[0-9a-f]{64}$'
       or expected_secret is null
       or expected_secret is distinct from
          encode(sha256(convert_to(want_secret, 'UTF8')), 'hex') then
      raise exception 'DEPT_BAD_BOOTSTRAP'
        using hint = 'Use the private founder link supplied during setup.';
    end if;

    -- The settings lock serializes validation and consumption with all signups.
    make_admin := true;
    update public.settings set claimed = true where id;
    delete from public.department_bootstrap where id;
    -- This is an AFTER INSERT trigger, so changing metadata does not recurse.
    -- Once consumed, the raw setup capability has no reason to remain in Auth.
    update auth.users
      set raw_user_meta_data = raw_user_meta_data - 'bootstrap_secret'
      where id = new.id;

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

-- ---------------------------------------------------------------------------
-- The per-member storage cap.
--
-- A trigger rather than a policy, because a policy cannot express "the sum of
-- what you already have, plus this". It runs as the table owner, so it sees
-- every member's rows regardless of who is inserting.
--
-- Honest about what it measures: `size_bytes` is what the browser said, the
-- same caveat the constraint above already carries. A member who understates
-- it is understating their own usage, and the bucket's own file_size_limit
-- still caps each individual object -- so this bounds the ordinary case, which
-- is the one that fills a free tier by accident.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_member_quota()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare cap_mb integer; used bigint;
begin
  select s.max_member_storage_mb into cap_mb from public.settings s where s.id;
  if cap_mb is null then return new; end if;

  select coalesce(sum(f.size_bytes), 0) into used
    from public.files f where f.owner_id = new.owner_id;

  if used + new.size_bytes > cap_mb::bigint * 1024 * 1024 then
    raise exception 'QUOTA_EXCEEDED'
      using hint = 'This account has reached the storage limit for this department.';
  end if;

  return new;
end; $fn$;

revoke execute on function public.enforce_member_quota() from anon, authenticated, public;

drop trigger if exists files_quota_check on public.files;
create trigger files_quota_check
  before insert on public.files
  for each row execute function public.enforce_member_quota();

-- ===========================================================================
--  MEMBER RPCs
-- ===========================================================================

-- Every other function on this page re-checks something before it writes.
-- This one did not, and Postgres grants EXECUTE to PUBLIC by default -- so the
-- department's anon key, which is in the page source of its own front door,
-- was enough to drive unbounded writes into the owner's database. The
-- membership check is what every other member RPC already does; the revoke is
-- what stops a signed-out caller reaching it at all.
--
-- It also counted every reload. A counter that a member can drive by holding
-- F5 is not a number anybody should sort by, and each press is a write into
-- the owner's database. What is worth counting is people, so the visit is
-- recorded per person and the counter only moves when that person has not
-- been here in the last hour.
create table if not exists public.file_views (
  file_id   uuid not null references public.files(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  last_seen timestamptz not null default now(),
  primary key (file_id, user_id)
);

-- RLS on with no policy: deny-all. Nothing reads this over the API -- who
-- looked at what is exactly the sort of thing a members-readable table should
-- not be able to answer. increment_view() reaches it as security definer.
alter table public.file_views enable row level security;

create or replace function public.increment_view(target uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare counted boolean;
begin
  if not public.is_active_member() then return; end if;

  -- A page can be opened with any id at all. Without this the insert below
  -- raises a foreign key violation where the old version quietly updated
  -- nothing, and the file page would 500 instead of rendering its 404.
  if not exists (select 1 from public.files f where f.id = target) then
    return;
  end if;

  insert into public.file_views (file_id, user_id, last_seen)
  values (target, auth.uid(), now())
  on conflict (file_id, user_id) do update
     set last_seen = now()
   where public.file_views.last_seen < now() - interval '1 hour'
  returning true into counted;

  -- Null when the ON CONFLICT clause matched nothing: they were already here.
  if counted then
    update public.files set view_count = view_count + 1 where id = target;
  end if;
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
  -- An anonymous auth.uid() is NULL. SQL's three-valued equality must never
  -- turn a failed ownership comparison into a skipped rejection branch.
  if not public.is_active_member() then raise exception 'NOT_A_MEMBER'; end if;

  select f.storage_path, f.owner_id into path, owner from public.files f where f.id = target;
  if path is null then raise exception 'NOT_FOUND'; end if;

  if owner is distinct from auth.uid() and not public.is_admin() then
    raise exception 'NOT_ALLOWED';
  end if;

  insert into public.audit_log (actor_id, action, target, detail)
  values (auth.uid(), 'file.delete', target::text,
          jsonb_build_object('storage_path', path, 'reason', why));

  delete from public.files where id = target;
  return path;
end; $fn$;

revoke execute on function public.delete_file(uuid, text) from anon, public;
grant execute on function public.delete_file(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The two flags an administrator may change on somebody else, and the one
-- outcome they may not arrive at.
--
-- Sequentially, a department cannot be left without an administrator here:
-- is_admin() already refused a caller who is banned or demoted, and
-- CANNOT_CHANGE_SELF means the caller is never the target -- so whoever
-- succeeds in changing a flag is themselves an administrator who is still
-- standing when the statement returns.
--
-- CONCURRENTLY it can. Two administrators who ban each other in the same
-- instant both pass is_admin() against a snapshot taken before the other's
-- write, and both commit. The department ends with an archive, a membership,
-- and nobody who can moderate any of it -- a state that is not recoverable
-- from inside the app at all. `profiles.is_admin` is outside the authenticated
-- UPDATE grant, this function refuses a caller who is not an administrator,
-- and there is deliberately no service_role key anywhere in this design to
-- climb back in with. It takes the project owner opening their own SQL editor,
-- which is a reasonable thing to document and an unreasonable thing to leave
-- one lost race away.
--
-- So: the same settings-row lock the signup trigger uses, for the same reason.
-- It orders the two transactions, which makes the loser's check read the
-- winner's committed result instead of a snapshot that predates it. The check
-- itself is on the OUTCOME rather than on the action -- one query instead of a
-- case analysis over which flag, which direction and how many administrators
-- are left -- and the raise rolls the losing ban back.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_flag(target uuid, flag text, value boolean)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if target = auth.uid() then raise exception 'CANNOT_CHANGE_SELF'; end if;

  -- Ordering, not reading. Every path that can remove an administrator takes
  -- this lock, so only one of them is ever in flight at a time.
  perform 1 from public.settings s where s.id for update;

  if flag = 'is_admin' then
    update public.profiles set is_admin = value where id = target;
  elsif flag = 'is_banned' then
    update public.profiles set is_banned = value where id = target;
  else
    raise exception 'UNKNOWN_FLAG';
  end if;

  if not exists (
    select 1 from public.profiles p where p.is_admin and not p.is_banned
  ) then
    raise exception 'LAST_ADMIN'
      using hint = 'A department must keep at least one administrator who is not banned.';
  end if;

  insert into public.audit_log (actor_id, action, target, detail)
  values (auth.uid(), 'member.' || flag, target::text, jsonb_build_object('value', value));
end; $fn$;

-- ---------------------------------------------------------------------------
-- Objects in the bucket that no longer have a row.
--
-- delete_file() removes the row and hands the path back for the caller to
-- delete the object, which is two steps -- and a browser that is closed, loses
-- its connection or is simply killed between them leaves the object behind.
-- Nothing in the app can see it after that, and it still counts against the
-- owner's storage. This is how they find out.
--
-- Listing only. Deleting the row out of storage.objects would drop the
-- metadata and leave the bytes where they are; the object has to go through
-- the storage API, which an administrator's own session is already allowed to
-- call. Same division of labour as delete_file().
--
-- Wrapped, because storage.objects belongs to supabase_storage_admin: on a
-- project where this function's owner cannot read it, an administration screen
-- should render without this panel rather than not render.
-- ---------------------------------------------------------------------------
create or replace function public.admin_orphaned_objects()
returns table (path text, size_bytes bigint, created_at timestamptz)
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  begin
    return query
      select o.name::text,
             coalesce((o.metadata ->> 'size')::bigint, 0),
             o.created_at
        from storage.objects o
       where o.bucket_id = 'department-files'
         -- Uploading bytes and filing metadata are separate requests. Give a
         -- normal upload an hour to finish before offering the object to purge.
         and o.created_at < now() - interval '1 hour'
         and not exists (
           select 1 from public.files f where f.storage_path = o.name
         )
       order by o.created_at
       limit 500;
  exception when others then
    raise warning 'could not read storage.objects: %', sqlerrm;
    return;
  end;
end; $fn$;

-- What each member is keeping, for the same screen. Counts rows rather than
-- objects, which is what the quota above is enforced against.
create or replace function public.admin_storage_usage()
returns table (owner_id uuid, username text, files bigint, bytes bigint)
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  return query
    select p.id, p.username, count(f.id), coalesce(sum(f.size_bytes), 0)::bigint
      from public.profiles p
      left join public.files f on f.owner_id = p.id
     group by p.id, p.username
     having count(f.id) > 0
     order by coalesce(sum(f.size_bytes), 0) desc;
end; $fn$;

-- ---------------------------------------------------------------------------
-- Erase the archive.
--
-- The counterpart to the setup wizard, and the piece that was missing: a
-- department could be created in four clicks and only ever taken apart by
-- hand, table by table, in somebody's SQL editor. Three things are actually
-- involved in deleting a department, they live in three different places, and
-- only one of them is reachable from in here:
--
--   the CONTENTS       this function. Files, votes, comments, reports,
--                      subjects, invites, the log, and every member account
--                      except the caller's.
--   the LISTING        a row in OpenDepartment's control plane, deleted by
--                      whoever registered the department, under Your
--                      departments. Nothing in this database can reach it.
--   the PROJECT itself only its owner can delete it -- from the Supabase
--                      dashboard, or through OpenDepartment when the
--                      deployment offers one-click setup and the owner
--                      authorises it. Nothing in here can reach that either,
--                      which is the same reason OpenDepartment never holds a
--                      service_role key.
--
-- So this is honest about its own scope, and the screen that calls it says the
-- other two out loud rather than letting "delete" imply all three.
--
-- Deliberate choices, each of which is the difference between an erased
-- archive and a hijacked one:
--
--   THE CALLER SURVIVES. Their profile, their e-mail row and their
--   administrator flag stay. An admin who deleted themselves along with
--   everybody else would be locked out mid-way -- unable to remove the storage
--   objects this function hands back, and unable to see that anything worked.
--
--   THE DOOR IS SHUT, not reopened. `claimed` stays true and `open_join` goes
--   false, with every invite gone. Resetting `claimed` would leave an empty
--   department that the next stranger to find the address founds as its
--   administrator, which is a worse outcome than the one being fixed.
--
--   THE BYTES ARE NOT ITS JOB. Deleting rows out of storage.objects would drop
--   the metadata and leave the objects where they are, so the paths come back
--   for the caller to remove through the storage API -- which an
--   administrator's own session is already allowed to do. Same division of
--   labour as delete_file().
--
-- The confirmation is checked HERE rather than by the form, for the same
-- reason every other rule in this file is: `files` is admin-deletable over
-- PostgREST anyway, but an RPC named like this one, callable with no argument
-- that has to match, is a single mis-click away from being irreversible.
-- ---------------------------------------------------------------------------
create or replace function public.purge_department(confirm text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  wanted     text;
  paths      text[];
  file_count bigint;
  members    bigint;
  accounts   text := 'deleted';
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  select s.department_name into wanted from public.settings s where s.id;
  if lower(trim(coalesce(confirm, ''))) is distinct from lower(trim(coalesce(wanted, ''))) then
    raise exception 'CONFIRMATION_MISMATCH';
  end if;

  select coalesce(array_agg(f.storage_path order by f.created_at), '{}'),
         count(*)
    into paths, file_count
    from public.files f;

  select count(*) into members
    from public.profiles p where p.id <> auth.uid();

  -- Most of this cascades from `files` and `profiles`, but naming each table
  -- is what keeps this correct when a table is added later: a new table with
  -- no cascade to either would otherwise survive the erasure silently.
  delete from public.reports;
  delete from public.comments;
  delete from public.votes;
  delete from public.file_subjects;
  delete from public.files;
  delete from public.subjects;
  delete from public.invites;
  delete from public.department_bootstrap;
  delete from public.audit_log;
  delete from public.user_emails where user_id <> auth.uid();
  delete from public.profiles   where id      <> auth.uid();

  -- The accounts themselves, so a member's e-mail address does not outlive
  -- the archive it was given to. Wrapped for the same reason
  -- admin_orphaned_objects() is: auth.users belongs to supabase_auth_admin,
  -- and on a project where this function's owner cannot delete from it an
  -- erasure should still erase everything else rather than raising. The
  -- profile rows are already gone either way, so nobody left behind here can
  -- read anything -- they simply still have a login to a department that has
  -- shut its door.
  begin
    delete from auth.users u where u.id <> auth.uid();
  exception when others then
    accounts := 'kept';
    raise warning 'could not delete auth.users: %', sqlerrm;
  end;

  update public.settings set open_join = false, claimed = true where id;

  -- The log was just emptied; this is the one row in it. Somebody who finds an
  -- empty archive tomorrow should be able to see who emptied it and when.
  insert into public.audit_log (actor_id, action, target, detail)
  values (auth.uid(), 'department.purge', null,
          jsonb_build_object('files', file_count, 'members', members,
                             'accounts', accounts));

  return jsonb_build_object(
    'files', file_count,
    'members', members,
    'accounts', accounts,
    'storage_paths', to_jsonb(paths)
  );
end; $fn$;

-- Stricter than its neighbours on purpose. The other admin RPCs rely on
-- Postgres granting EXECUTE to PUBLIC and on their own is_admin() check, which
-- is enough when the worst a refused caller can do is read nothing. This one
-- deletes an archive, so the signed-out role does not get to reach the check
-- at all.
revoke execute on function public.purge_department(text) from anon, public;
grant  execute on function public.purge_department(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Leave, and take your things with you.
--
-- Everything else in this schema is written from the department's side: what
-- an administrator may do to a member, what a member may do to a document.
-- There was no answer at all to the member who simply wants out. Signing out
-- ends a session; the profile, the e-mail address, the documents, the comments
-- and the votes all stay, and the only person who could remove any of it was
-- an administrator the member has no claim on. For an archive whose subject is
-- frequently a real person that is the wrong default, and it is the one
-- deletion the department's own privacy notice implies exists.
--
-- The shape is purge_department()'s, deliberately, because the problem is the
-- same one at a smaller scale:
--
--   THE BYTES ARE NOT ITS JOB. The storage paths come back for the caller to
--   remove through the storage API, which their own session is already allowed
--   to do for their own folder. Deleting the rows out of storage.objects here
--   would drop the metadata and leave the objects where they are.
--
--   THE ACCOUNT GOES TOO, when it can. A member's e-mail address should not
--   outlive the membership it was given to. Wrapped for the same reason
--   purge_department() wraps it: auth.users belongs to supabase_auth_admin,
--   and on a project where this function's owner cannot delete from it the
--   erasure should still erase everything else. The profile is gone either
--   way, so what is left behind is a login to a department that no longer
--   knows who they are.
--
--   THE LAST ADMINISTRATOR MAY NOT LEAVE. This is the check that actually
--   bites -- unlike the one in admin_set_flag() above, which the
--   CANNOT_CHANGE_SELF rule already makes unreachable sequentially. A sole
--   administrator pressing this button would leave a live archive with a
--   membership and nobody who can moderate it, and no way back in short of
--   the project owner's SQL editor. They are told to hand the department over
--   or erase it instead, both of which they can do from the administration
--   screen. Same settings lock as admin_set_flag(), so two administrators
--   leaving at once cannot both read "there is another one".
--
-- What it deliberately does NOT do is anonymise in place. A comment whose
-- author row is gone is a comment attributed to nobody, and the archive is
-- more honest with the thread missing than with a ghost in it -- so comments
-- and votes go with the profile, by cascade.
-- ---------------------------------------------------------------------------
create or replace function public.leave_department(confirm text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  me         uuid := auth.uid();
  handle     text;
  paths      text[];
  file_count bigint;
  account    text := 'deleted';
begin
  if not public.is_active_member() then raise exception 'NOT_A_MEMBER'; end if;

  -- Ordered against admin_set_flag() and against another member leaving.
  perform 1 from public.settings s where s.id for update;

  select p.username into handle from public.profiles p where p.id = me;

  -- Typed confirmation for the same reason purge_department() asks for one:
  -- this is irreversible, and an RPC named like this one that takes no
  -- argument that has to match is a single mis-click from being called. A
  -- member who never chose a username confirms with the word instead, because
  -- there is nothing else of theirs to type.
  if lower(trim(coalesce(confirm, ''))) is distinct from
     lower(trim(coalesce(handle, 'leave'))) then
    raise exception 'CONFIRMATION_MISMATCH';
  end if;

  if public.is_admin() and not exists (
    select 1 from public.profiles p
     where p.is_admin and not p.is_banned and p.id <> me
  ) then
    raise exception 'LAST_ADMIN'
      using hint = 'Promote another administrator, or erase the department instead.';
  end if;

  select coalesce(array_agg(f.storage_path order by f.created_at), '{}'), count(*)
    into paths, file_count
    from public.files f where f.owner_id = me;

  -- Named rather than left to the cascade, for the same reason
  -- purge_department() names its tables: a table added later with no cascade
  -- to profiles would otherwise survive this silently. reports filed BY this
  -- member go; reports filed ABOUT their documents go with the documents.
  delete from public.reports    where reporter_id = me;
  delete from public.comments   where author_id = me;
  delete from public.votes      where user_id = me;
  delete from public.file_views where user_id = me;
  delete from public.files      where owner_id = me;
  delete from public.user_emails where user_id = me;

  -- The log outlives the member on purpose, and says so: an audit trail that
  -- can be emptied by the person it is about is not one. actor_id is
  -- `on delete set null`, so what remains is the action and its date.
  insert into public.audit_log (actor_id, action, target, detail)
  values (me, 'member.leave', me::text,
          jsonb_build_object('files', file_count, 'username', handle));

  delete from public.profiles where id = me;

  begin
    delete from auth.users u where u.id = me;
  exception when others then
    account := 'kept';
    raise warning 'could not delete auth.users: %', sqlerrm;
  end;

  return jsonb_build_object(
    'files', file_count,
    'account', account,
    'storage_paths', to_jsonb(paths)
  );
end; $fn$;

-- Same reasoning as purge_department(): a function that erases things does not
-- get to be reachable by the signed-out role, even though its first line would
-- refuse them.
revoke execute on function public.leave_department(text) from anon, public;
grant  execute on function public.leave_department(text) to authenticated;

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
               max_member_storage_mb, operator_name, operator_contact,
               open_join)
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
  for update to authenticated
  using (id = auth.uid() and public.is_active_member())
  with check (id = auth.uid() and public.is_active_member());

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
  for delete to authenticated
  using (public.is_active_member() and (owner_id = auth.uid() or public.is_admin()));

-- Same column-level reasoning as `profiles` above. Everything on this table
-- past the three descriptive fields is a counter maintained by a trigger, and
-- "you may update your own row" would otherwise mean "you may set your own
-- score to 9999". The counter triggers and increment_view() are
-- `security definer`, so they still write whatever they like.
revoke update on public.files from anon, authenticated;
grant  update (title, description, category) on public.files to authenticated;

-- Defaults are not protection: a caller with table-wide INSERT can supply
-- forged scores, counters, case numbers or timestamps on a brand-new row.
revoke insert on public.files from anon, authenticated;
grant insert (owner_id, title, description, category, storage_path,
              original_name, mime_type, size_bytes, kind)
  on public.files to authenticated;

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

-- Every report starts open and unresolved at the database's current time.
-- Administrator resolution continues through the UPDATE policy below.
revoke insert on public.reports from anon, authenticated;
grant insert (file_id, comment_id, reporter_id, reason, details)
  on public.reports to authenticated;

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
--  Use the PRIVATE FOUNDER LINK from the wizard to create the administrator.
--  The public department address alone never authorizes the first signup.
-- ===========================================================================
