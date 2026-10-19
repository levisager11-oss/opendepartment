-- DEMO DEPARTMENT ONLY: undo exactly the optional demo-harden.sql additions.
-- Leaves all accounts/content intact. Never deletes storage objects.
begin;
drop policy if exists "demo harden: upload limits" on storage.objects;
drop policy if exists demo_harden_files_insert on public.files;
drop trigger if exists demo_harden_comments on public.comments;
drop trigger if exists demo_harden_accounts on public.profiles;
do $$ begin
  drop trigger if exists demo_harden_credentials on auth.users;
exception when insufficient_privilege then
  raise notice 'Cannot remove demo credential guard; run undo as an Auth table owner.';
end $$;
drop function if exists public.demo_credential_guard();
drop function if exists public.demo_comment_limit();
drop function if exists public.demo_account_limit();
drop function if exists public.demo_upload_allowed();
drop function if exists public.demo_file_allowed();
drop function if exists public.demo_shared_account(uuid);
drop function if exists public.demo_limits();
drop table if exists public.demo_throttle;
do $$ begin
  if to_regclass('public.demo_harden_settings_backup') is not null then
    update public.settings s set max_upload_mb=b.max_upload_mb,
      max_member_storage_mb=b.max_member_storage_mb
      from public.demo_harden_settings_backup b where s.id=b.id;
  end if;
end $$;
drop table if exists public.demo_harden_settings_backup;
commit;
