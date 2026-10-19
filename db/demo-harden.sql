-- DEMO DEPARTMENT ONLY
-- Optional manual hardening for The Open Files. Apply AFTER tenant-schema.sql
-- and seed-demo.sql, only in the dedicated demo project. Re-run after upgrades.
-- Limits uploads, comments and signups; protects shared account credentials.
-- Undo: run demo-harden-undo.sql (also restores the original settings caps).
-- Never deletes storage objects; use the Storage API/dashboard for cleanup.
begin;

create table if not exists public.demo_harden_settings_backup as
  select id, max_upload_mb, max_member_storage_mb from public.settings;
alter table public.demo_harden_settings_backup enable row level security;
revoke all on public.demo_harden_settings_backup from public, anon, authenticated;
update public.settings set max_upload_mb = 2, max_member_storage_mb = 20 where id;

create or replace function public.demo_limits() returns jsonb
language sql immutable set search_path = public as $$
  select '{"storage_bytes":314572800,"member_bytes":20971520,"uploads_day":20,
    "comments_ten_minutes":10,"comments_day":50,"comments_ip_hour":30,
    "accounts_hour":20,"accounts_day":100}'::jsonb;
$$;
revoke execute on function public.demo_limits() from public, anon, authenticated;

create or replace function public.demo_shared_account(who uuid) returns boolean
language sql immutable set search_path = public as $$
  select who = any(array['11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333']::uuid[]);
$$;
revoke execute on function public.demo_shared_account(uuid) from public, anon, authenticated;

-- Definer reads all objects without policy recursion, including unfiled objects.
-- The incoming size is unavailable here. The bucket's 2 MiB per-file ceiling
-- bounds overshoot per in-flight upload; this is not a byte reservation system.
create or replace function public.demo_upload_allowed() returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  limits jsonb := public.demo_limits();
  total_bytes numeric; member_bytes numeric; daily bigint;
begin
  if me is null then return false; end if;
  if public.demo_shared_account(me) then raise exception 'DEMO_UPLOADS_DISABLED'; end if;
  perform pg_advisory_xact_lock(20261019, 10);
  select coalesce(sum(coalesce((metadata->>'size')::numeric,0)),0),
    coalesce(sum(coalesce((metadata->>'size')::numeric,0)) filter
      (where owner = me or split_part(name,'/',1) = me::text),0),
    count(*) filter (where (owner = me or split_part(name,'/',1) = me::text)
      and created_at > now() - interval '24 hours')
    into total_bytes, member_bytes, daily
    from storage.objects where bucket_id = 'department-files';
  if daily >= (limits->>'uploads_day')::int then raise exception 'RATE_LIMITED'; end if;
  if total_bytes >= (limits->>'storage_bytes')::bigint
     or member_bytes >= (limits->>'member_bytes')::bigint then
    raise exception 'DEMO_STORAGE_FULL';
  end if;
  return true;
end; $$;
revoke execute on function public.demo_upload_allowed() from public, anon, authenticated;
grant execute on function public.demo_upload_allowed() to authenticated;
drop policy if exists "demo harden: upload limits" on storage.objects;
create policy "demo harden: upload limits" on storage.objects as restrictive
  for insert to authenticated with check
  (case when bucket_id = 'department-files' then public.demo_upload_allowed() else true end);

-- Files are already uploaded when a files row is inserted, so only the shared
-- account guard belongs here (do not count that completed upload a second time).
create or replace function public.demo_file_allowed() returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if public.demo_shared_account(auth.uid()) then raise exception 'DEMO_UPLOADS_DISABLED'; end if;
  return auth.uid() is not null;
end; $$;
revoke execute on function public.demo_file_allowed() from public, anon, authenticated;
grant execute on function public.demo_file_allowed() to authenticated;
drop policy if exists demo_harden_files_insert on public.files;
create policy demo_harden_files_insert on public.files as restrictive
  for insert to authenticated with check (public.demo_file_allowed());

create table if not exists public.demo_throttle (
  kind text not null, sender text not null, at timestamptz not null default now()
);
create index if not exists demo_throttle_sender_idx on public.demo_throttle(kind,sender,at);
alter table public.demo_throttle enable row level security;
revoke all on public.demo_throttle from public, anon, authenticated;

create or replace function public.demo_comment_limit() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare headers json; address text; sender_key text; limits jsonb := public.demo_limits();
begin
  perform pg_advisory_xact_lock(20261019, 11);
  -- Ignore client-supplied timestamps so backdating cannot evade the windows.
  new.created_at := now();
  if (select count(*) from public.comments where author_id = new.author_id
      and created_at > now() - interval '10 minutes') >= (limits->>'comments_ten_minutes')::int
    or (select count(*) from public.comments where author_id = new.author_id
      and created_at > now() - interval '1 day') >= (limits->>'comments_day')::int then
    raise exception 'RATE_LIMITED';
  end if;
  begin
    headers := nullif(current_setting('request.headers', true),'')::json;
  exception when others then headers := null;
  end;
  address := coalesce(nullif(trim(headers->>'cf-connecting-ip'),''),
    nullif(trim(headers->>'x-real-ip'),''),
    nullif(trim(split_part(headers->>'x-forwarded-for',',',1)),''));
  delete from public.demo_throttle where at < now() - interval '1 day';
  if address is not null then
    sender_key := encode(sha256(convert_to('ip:' || address,'UTF8')),'hex');
    if (select count(*) from public.demo_throttle where kind='comment_ip'
        and sender=sender_key and at > now() - interval '1 hour') >= (limits->>'comments_ip_hour')::int then
      raise exception 'RATE_LIMITED';
    end if;
    insert into public.demo_throttle(kind,sender) values ('comment_ip',sender_key);
  end if;
  return new;
end; $$;
revoke execute on function public.demo_comment_limit() from public, anon, authenticated;
drop trigger if exists demo_harden_comments on public.comments;
create trigger demo_harden_comments before insert on public.comments
  for each row execute function public.demo_comment_limit();

-- GoTrue's DB connection has no request.headers. Auth's built-in IP limits
-- supply the per-IP layer; this trigger bounds department-wide signups.
create or replace function public.demo_account_limit() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare limits jsonb := public.demo_limits();
begin
  perform pg_advisory_xact_lock(20261019, 12);
  -- Existing profiles are not new accounts (including seed re-runs).
  if exists (select 1 from public.profiles where id=new.id) then return new; end if;
  new.created_at := now();
  if (select count(*) from public.profiles where created_at > now() - interval '1 hour') >= (limits->>'accounts_hour')::int
    or (select count(*) from public.profiles where created_at > now() - interval '1 day') >= (limits->>'accounts_day')::int then
    raise exception 'RATE_LIMITED';
  end if;
  return new;
end; $$;
revoke execute on function public.demo_account_limit() from public, anon, authenticated;
drop trigger if exists demo_harden_accounts on public.profiles;
create trigger demo_harden_accounts before insert on public.profiles
  for each row execute function public.demo_account_limit();

create or replace function public.demo_credential_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare preserved jsonb;
begin
  if public.demo_shared_account(old.id) then
    -- jsonb_populate_record touches only columns present in the actual row,
    -- supporting both the test shim and GoTrue versions with optional fields.
    select jsonb_object_agg(key,value) into preserved from jsonb_each(to_jsonb(old))
      where key in ('encrypted_password','email','phone','email_change','phone_change',
        'email_change_token_new','email_change_token_current','email_change_confirm_status',
        'email_change_sent_at','phone_change_token','phone_change_sent_at');
    new := jsonb_populate_record(new, preserved);
  end if;
  return new;
end; $$;
revoke execute on function public.demo_credential_guard() from public, anon, authenticated;
do $$ begin
  drop trigger if exists demo_harden_credentials on auth.users;
  create trigger demo_harden_credentials before update on auth.users
    for each row execute function public.demo_credential_guard();
exception when insufficient_privilege then
  raise notice 'Cannot install demo credential guard on auth.users; install as an Auth table owner.';
end $$;
commit;
