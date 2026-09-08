-- Parent-row deletion must not silently remove a suspended listing.
\set ON_ERROR_STOP on
\o /dev/null
select odtest.as_owner();
insert into auth.users (id,email) values
  ('b1000000-0000-0000-0000-000000000001','suspended-operator@example.test');
insert into public.departments (slug,operator_id,supabase_url,anon_key,display_name,status)
values ('audit-suspended','b1000000-0000-0000-0000-000000000001',
  'https://auditproject.supabase.co','public-test-key','Suspended department','suspended');
select odtest.as_user('b1000000-0000-0000-0000-000000000001');
select odtest.touches_nothing('operator cannot delete their profile to cascade a suspended listing',
  $$delete from public.operators where id=auth.uid()$$);
select odtest.as_owner();
select odtest.equals('suspended listing survives parent-row deletion attempt',
  $$select count(*)::text from public.departments where slug='audit-suspended' and status='suspended'$$,'1');
select odtest.as_user('b1000000-0000-0000-0000-000000000001');
select odtest.allowed('operator can still edit their display name',
  $$update public.operators set display_name='New display name' where id=auth.uid()$$);
select odtest.equals('operator can still register a department below the cap',
  $$select public.register_department('audit-second','https://auditsecond.supabase.co','public-test-key','Second')$$,
  'audit-second');
select odtest.equals('operator can register the final allowed department',
  $$select public.register_department('audit-third','https://auditthird.supabase.co','public-test-key','Third')$$,
  'audit-third');
select odtest.denied('suspended listings continue to count toward the account cap',
  $$select public.register_department('audit-fourth','https://auditfourth.supabase.co','public-test-key','Fourth')$$);
select odtest.as_owner();
\o
select * from odtest.report() where outcome='FAIL';
do $$ begin
  if exists (select 1 from odtest.results where not passed) then
    raise exception 'Control-plane security regression failures: %',
      (select string_agg(name, '; ') from odtest.results where not passed);
  end if;
end $$;
