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
-- One Supabase project backs at most one department, so a suspension cannot be
-- walked around by registering a second slug against the same coordinates.
-- Both values a mirror would need are public: they are served to every visitor
-- of the original's front door.
select odtest.as_owner();
insert into auth.users (id,email) values
  ('b1000000-0000-0000-0000-000000000002','mirror-operator@example.test');
select odtest.as_user('b1000000-0000-0000-0000-000000000002');
select odtest.denied('a stranger cannot register a second slug against a live project',
  $$select public.register_department('audit-mirror','https://auditsecond.supabase.co','public-test-key','Mirror')$$);
select odtest.denied('a stranger cannot register a second slug against a SUSPENDED project',
  $$select public.register_department('audit-evasion','https://auditproject.supabase.co','public-test-key','Evasion')$$);
select odtest.equals('registering their own distinct project still works',
  $$select public.register_department('audit-mirror','https://auditmirror.supabase.co','public-test-key','Mirror')$$,
  'audit-mirror');
select odtest.denied('an operator cannot repoint their department at a project already registered',
  $$update public.departments set supabase_url='https://auditsecond.supabase.co' where slug='audit-mirror'$$);
select odtest.allowed('an operator can still repoint at an unregistered project',
  $$update public.departments set supabase_url='https://auditmoved.supabase.co' where slug='audit-mirror'$$);
select odtest.allowed('an update that leaves the project alone is not refused as its own duplicate',
  $$update public.departments set display_name='Renamed' where slug='audit-mirror'$$);
select odtest.as_owner();
select odtest.equals('the suspended project still backs exactly one listing',
  $$select count(*)::text from public.departments where supabase_url='https://auditproject.supabase.co'$$,'1');

select odtest.as_owner();
\o
select * from odtest.report() where outcome='FAIL';
do $$ begin
  if exists (select 1 from odtest.results where not passed) then
    raise exception 'Control-plane security regression failures: %',
      (select string_agg(name, '; ') from odtest.results where not passed);
  end if;
end $$;
