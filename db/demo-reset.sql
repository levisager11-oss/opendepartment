-- DEMO DEPARTMENT ONLY. Apply manually AFTER seed-demo.sql, never to a real
-- department. This opt-in API wipes visitor contributions daily. Re-runnable.
-- Undo: apply demo-reset-undo.sql and remove the Vercel demo reset env vars.
-- No storage DELETE here: Supabase requires the Storage API.
begin;

create or replace function public.demo_reset()
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  keep_ids uuid[];
  removed_files bigint;
  removed_members bigint;
  removed_accounts bigint := 0;
  paths text[];
begin
  if not coalesce((select claimed from public.settings where id), false)
     or not exists (select 1 from public.profiles where is_admin and not is_banned) then
    raise exception 'A claimed department and active administrator are required';
  end if;
  select array_agg(id) into keep_ids from public.profiles
   where is_admin or id in (
    '11111111-1111-4111-8111-111111111111'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid);
  select count(*) into removed_files from public.files;
  select count(*) into removed_members from public.profiles where not (id = any(keep_ids));
  delete from public.reports;
  delete from public.comments;
  delete from public.votes;
  delete from public.file_subjects;
  delete from public.file_views;
  delete from public.files;
  delete from public.subjects;
  delete from public.invites;
  delete from public.user_emails where not (user_id = any(keep_ids));
  delete from public.profiles where not (id = any(keep_ids));
  -- Auth is owned by supabase_auth_admin; retain the row reset if permissions
  -- prevent account deletion, just as purge_department() does.
  begin
    delete from auth.users where not (id = any(keep_ids));
    get diagnostics removed_accounts = row_count;
  exception when others then
    raise warning 'could not delete auth.users: %', sqlerrm;
  end;
  update public.profiles set username = case id
    when '11111111-1111-4111-8111-111111111111'::uuid then 'agent_k'
    when '22222222-2222-4222-8222-222222222222'::uuid then 'agent_m'
    else 'agent_q' end
   where id in ('11111111-1111-4111-8111-111111111111'::uuid,
                '22222222-2222-4222-8222-222222222222'::uuid,
                '33333333-3333-4333-8333-333333333333'::uuid);
  perform public.demo_seed_content();
  select array_agg(p order by p) into paths from public.files f,
    lateral unnest(array[f.storage_path, f.thumb_path]) p where p is not null;
  insert into public.audit_log(action, detail) values ('demo.reset',
    jsonb_build_object('files', removed_files, 'members', removed_members, 'accounts', removed_accounts));
  return jsonb_build_object('files', removed_files, 'members', removed_members,
    'accounts', removed_accounts, 'keep_paths', paths);
end; $fn$;

create or replace function public.demo_storage_extras()
returns setof text language plpgsql security definer set search_path = public as $fn$
begin
  begin
    return query select o.name::text from storage.objects o
     where o.bucket_id = 'department-files'
       and not exists (select 1 from public.files f
         where f.storage_path = o.name or f.thumb_path = o.name);
  exception when others then
    raise warning 'could not read storage.objects: %', sqlerrm;
    return;
  end;
end; $fn$;

create or replace function public.demo_sync_sizes()
returns bigint language plpgsql security definer set search_path = public as $fn$
declare changed bigint;
begin
  update public.files f set size_bytes = (o.metadata->>'size')::bigint
    from storage.objects o where o.bucket_id = 'department-files'
      and o.name = f.storage_path and (o.metadata->>'size')::bigint >= 0;
  get diagnostics changed = row_count;
  return changed;
end; $fn$;

revoke execute on function public.demo_reset(), public.demo_storage_extras(), public.demo_sync_sizes() from public, anon, authenticated;
grant execute on function public.demo_reset(), public.demo_storage_extras(), public.demo_sync_sizes() to service_role;
commit;
