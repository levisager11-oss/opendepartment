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

-- The takedown queue had no reader at all. Now it has one, and the flag that
-- decides who is deliberately outside every path a signed-in caller has: the
-- alternative was gating the platform's moderation authority on an env var,
-- which cannot gate PostgREST.
--
-- Its own department and its own slug filter throughout: the suite above fills
-- the queue to its cap testing that cap, so any assertion counting the whole
-- table here would be counting somebody else's fixtures.
select odtest.as_owner();
insert into auth.users (id,email) values
  ('b1000000-0000-0000-0000-000000000003','staff@example.test'),
  ('b1000000-0000-0000-0000-000000000004','ordinary@example.test');
select odtest.as_user('b1000000-0000-0000-0000-000000000004');
select odtest.equals('the reported department registers normally',
  $$select public.register_department('audit-staff','https://auditstaff.supabase.co','public-test-key','Staff test')$$,
  'audit-staff');
select odtest.as_anon();
select odtest.allowed('anybody may file a complaint about it, with no account',
  $$select public.report_department('audit-staff','illegal','A complaint','reporter@example.test')$$);

select odtest.as_user('b1000000-0000-0000-0000-000000000004');
select odtest.equals('an ordinary operator is not staff',
  $$select public.is_staff()::text$$,'false');
select odtest.denied('an ordinary operator cannot read the takedown queue',
  $$select * from public.staff_list_reports()$$);
select odtest.denied('an ordinary operator cannot suspend a department',
  $$select public.staff_set_department_status('audit-staff','suspended','because')$$);
select odtest.touches_nothing('an operator cannot make themselves staff',
  $$update public.operators set is_staff = true where id = auth.uid()$$);
-- RLS with no policy: the read succeeds and returns nothing, which is a
-- different shape of refusal from the raise above and worth asserting as one.
select odtest.equals('the reports table itself stays unreadable',
  $$select count(*)::text from public.abuse_reports$$,'0');

select odtest.as_anon();
select odtest.denied('a signed-out caller cannot read the takedown queue',
  $$select * from public.staff_list_reports()$$);

select odtest.as_owner();
update public.operators set is_staff = true
 where id='b1000000-0000-0000-0000-000000000003';
select odtest.as_user('b1000000-0000-0000-0000-000000000003');
select odtest.equals('staff can read the complaint',
  $$select count(*)::text from public.staff_list_reports('open') where slug='audit-staff'$$,'1');
select odtest.equals('a report carries the current state of the department it names',
  $$select department_status from public.staff_list_reports('open') where slug='audit-staff'$$,'active');
select odtest.allowed('staff can suspend the department a report names',
  $$select public.staff_set_department_status('audit-staff','suspended','Reported')$$);
select odtest.equals('the suspension reads back on the report',
  $$select department_status from public.staff_list_reports('open') where slug='audit-staff'$$,'suspended');
select odtest.denied('staff cannot invent a department status',
  $$select public.staff_set_department_status('audit-staff','deleted','no')$$);
select odtest.denied('staff cannot act on a department that does not exist',
  $$select public.staff_set_department_status('no-such-dept','suspended',null)$$);
-- The id comes from the function, not the table: `abuse_reports` stays closed
-- to every role including this one, and staff_list_reports() is the only way
-- in. Reading it any other way here would be testing a door that is not there.
select odtest.denied('staff cannot invent a report status',
  $$select public.staff_resolve_report(
      (select id from public.staff_list_reports('open') where slug='audit-staff' limit 1),
      'ignored')$$);
select odtest.allowed('staff can close a report',
  $$select public.staff_resolve_report(
      (select id from public.staff_list_reports('open') where slug='audit-staff' limit 1),
      'resolved')$$);
select odtest.equals('a closed report leaves the open queue',
  $$select count(*)::text from public.staff_list_reports('open') where slug='audit-staff'$$,'0');
select odtest.equals('the takedown trail keeps it rather than deleting it',
  $$select count(*)::text from public.staff_list_reports('resolved') where slug='audit-staff'$$,'1');

select odtest.as_owner();
select odtest.equals('a suspended department stops resolving for visitors',
  $$select count(*)::text from public.resolve_department('audit-staff')$$,'0');
select odtest.equals('suspension records why, for whoever reads the row later',
  $$select suspended_note from public.departments where slug='audit-staff'$$,'Reported');

select odtest.as_owner();
\o
select * from odtest.report() where outcome='FAIL';
do $$ begin
  if exists (select 1 from odtest.results where not passed) then
    raise exception 'Control-plane security regression failures: %',
      (select string_agg(name, '; ') from odtest.results where not passed);
  end if;
end $$;
