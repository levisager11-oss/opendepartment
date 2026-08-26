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
  created_at       timestamptz not null default now()
);

insert into public.settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 1. INVITES -- the only door into a department.
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

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$fn$;

create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce((select not is_banned from public.profiles where id = auth.uid()), false);
$fn$;

-- ---------------------------------------------------------------------------
-- New-user hook. Runs for e-mail/password AND OAuth signups, because both
-- INSERT into auth.users. Rejecting here cannot be bypassed from the client.
--
-- Two ways in:
--   1. Nobody has claimed the department yet -> this user founds it as admin.
--   2. They presented a valid invite code.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  clean_email text := lower(trim(new.email));
  unclaimed   boolean;
  want_code   text;
  inv         public.invites%rowtype;
  make_admin  boolean := false;
begin
  select not s.claimed into unclaimed from public.settings s where s.id;

  if unclaimed then
    -- The first account through the door founds the department.
    make_admin := true;
    update public.settings set claimed = true where id;

  else
    -- Named want_code, not code: `code` is also a column on public.invites,
    -- and plpgsql refuses an ambiguous reference inside the lookup below.
    want_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
    if want_code = '' then
      raise exception 'DEPT_NO_INVITE'
        using hint = 'An invite code is required to join this department.';
    end if;

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

create or replace function public.increment_view(target uuid)
returns void language sql security definer set search_path = public as $fn$
  update public.files set view_count = view_count + 1 where id = target;
$fn$;

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
create or replace function public.department_identity()
returns table (department_name text, tagline text, subject_label text,
               docket_prefix text, seal_top text, seal_bottom text,
               accent text, categories text[],
               max_upload_mb integer, claimed boolean)
language sql security definer set search_path = public as $fn$
  select s.department_name, s.tagline, s.subject_label, s.docket_prefix,
         s.seal_top, s.seal_bottom, s.accent, s.categories,
         s.max_upload_mb, s.claimed
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

drop policy if exists files_update_own on public.files;
create policy files_update_own on public.files
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists files_delete_own_or_admin on public.files;
create policy files_delete_own_or_admin on public.files
  for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

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
drop policy if exists votes_own on public.votes;
create policy votes_own on public.votes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

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
insert into storage.buckets (id, name, public, file_size_limit)
values ('department-files', 'department-files', false, 26214400)
on conflict (id) do update set public = false;

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
