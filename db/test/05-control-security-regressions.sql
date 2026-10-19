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

-- Waitlist tables are closed to both API roles; RPC assertions run as callers.
select odtest.as_owner();
create or replace function odtest.waitlist_error(name text, stmt text, expected text)
returns void language plpgsql as $$
begin
  execute stmt;
  raise sqlstate 'P9001' using message = 'unexpected success';
exception when others then
  perform odtest.record(name, sqlstate = 'P0001' and sqlerrm = expected, sqlstate || ': ' || sqlerrm);
end; $$;
grant execute on function odtest.waitlist_error(text, text, text) to anon, authenticated;
select odtest.as_anon();
select odtest.denied('anon cannot select waitlist', $$select * from public.waitlist$$);
select odtest.denied('anon cannot insert waitlist', $$insert into public.waitlist (email,group_size,expected_storage,willingness_to_pay) values ('direct@example.test',2,'under_1gb',3)$$);
select odtest.denied('anon cannot update waitlist', $$update public.waitlist set email='changed@example.test'$$);
select odtest.denied('anon cannot delete waitlist', $$delete from public.waitlist$$);
select odtest.denied('anon cannot select waitlist_throttle', $$select * from public.waitlist_throttle$$);
select odtest.denied('anon cannot insert waitlist_throttle', $$insert into public.waitlist_throttle (sender) values ('clear')$$);
select odtest.denied('anon cannot update waitlist_throttle', $$update public.waitlist_throttle set sender='changed'$$);
select odtest.denied('anon cannot delete waitlist_throttle', $$delete from public.waitlist_throttle$$);
select odtest.denied('anon cannot call the cap helper', $$select public.max_waitlist_rows()$$);
select odtest.as_user('b1000000-0000-0000-0000-000000000004');
select odtest.denied('authenticated cannot select waitlist', $$select * from public.waitlist$$);
select odtest.denied('authenticated cannot insert waitlist', $$insert into public.waitlist (email,group_size,expected_storage,willingness_to_pay) values ('direct@example.test',2,'under_1gb',3)$$);
select odtest.denied('authenticated cannot update waitlist', $$update public.waitlist set email='changed@example.test'$$);
select odtest.denied('authenticated cannot delete waitlist', $$delete from public.waitlist$$);
select odtest.denied('authenticated cannot select waitlist_throttle', $$select * from public.waitlist_throttle$$);
select odtest.denied('authenticated cannot insert waitlist_throttle', $$insert into public.waitlist_throttle (sender) values ('clear')$$);
select odtest.denied('authenticated cannot update waitlist_throttle', $$update public.waitlist_throttle set sender='changed'$$);
select odtest.denied('authenticated cannot delete waitlist_throttle', $$delete from public.waitlist_throttle$$);
select odtest.denied('authenticated cannot call the cap helper', $$select public.max_waitlist_rows()$$);
select odtest.as_anon();
select set_config('request.headers', '{"cf-connecting-ip":"203.0.113.40","x-real-ip":"192.0.2.1"}', false);
select odtest.allowed('anon joins waitlist', $$select public.join_waitlist(' Waitlist@Example.test ',2,'under_1gb',3)$$);
select odtest.allowed('duplicate email quietly succeeds', $$select public.join_waitlist('WAITLIST@example.test',8,'over_100gb',10)$$);
select odtest.as_owner();
select odtest.equals('waitlist email normalized and deduplicated', $$select count(*)::text from public.waitlist where email='waitlist@example.test'$$,'1');
select odtest.equals('both accepted calls counted by hashed preferred IP',
  $$select count(*)::text from public.waitlist_throttle where sender=encode(sha256(convert_to('ip:203.0.113.40','UTF8')),'hex')$$,'2');
select odtest.as_anon();
select odtest.waitlist_error('INVALID_EMAIL: bad,1,under_1gb,0', $$select public.join_waitlist('bad',1,'under_1gb',0)$$, 'INVALID_EMAIL');
select odtest.waitlist_error('INVALID_EMAIL: null,1,under_1gb,0', $$select public.join_waitlist(null,1,'under_1gb',0)$$, 'INVALID_EMAIL');
select odtest.waitlist_error('INVALID_EMAIL: repeat(a,250)||@x.test,1,under_1gb,0', $$select public.join_waitlist(repeat('a',250)||'@x.test',1,'under_1gb',0)$$, 'INVALID_EMAIL');
select odtest.waitlist_error('INVALID_GROUP_SIZE: a@b.test,0,under_1gb,0', $$select public.join_waitlist('a@b.test',0,'under_1gb',0)$$, 'INVALID_GROUP_SIZE');
select odtest.waitlist_error('INVALID_GROUP_SIZE: a@b.test,10001,under_1gb,0', $$select public.join_waitlist('a@b.test',10001,'under_1gb',0)$$, 'INVALID_GROUP_SIZE');
select odtest.waitlist_error('INVALID_GROUP_SIZE: a@b.test,null,under_1gb,0', $$select public.join_waitlist('a@b.test',null,'under_1gb',0)$$, 'INVALID_GROUP_SIZE');
select odtest.waitlist_error('INVALID_STORAGE: a@b.test,1,bad,0', $$select public.join_waitlist('a@b.test',1,'bad',0)$$, 'INVALID_STORAGE');
select odtest.waitlist_error('INVALID_STORAGE: a@b.test,1,null,0', $$select public.join_waitlist('a@b.test',1,null,0)$$, 'INVALID_STORAGE');
select odtest.waitlist_error('INVALID_PRICE: a@b.test,1,under_1gb,4', $$select public.join_waitlist('a@b.test',1,'under_1gb',4)$$, 'INVALID_PRICE');
select odtest.waitlist_error('INVALID_PRICE: a@b.test,1,under_1gb,null', $$select public.join_waitlist('a@b.test',1,'under_1gb',null)$$, 'INVALID_PRICE');
select odtest.allowed('five accepted calls including duplicates', $$
  select public.join_waitlist('waitlist@example.test',2,'under_1gb',0) from generate_series(1,3)
$$);
select odtest.waitlist_error('sixth call is rate limited', $$select public.join_waitlist('sixth@example.test',1,'under_1gb',0)$$, 'RATE_LIMITED');
select odtest.as_owner();
insert into public.waitlist_throttle (sender, at) values ('expired', now() - interval '2 days');
select odtest.as_user('b1000000-0000-0000-0000-000000000004');
select set_config('request.headers', '{"x-real-ip":"192.0.2.40"}', false);
select odtest.allowed('authenticated caller can join from another sender', $$select public.join_waitlist('signedin@example.test',10000,'10_100gb',5)$$);
select odtest.as_owner();
select odtest.equals('expired throttle purged', $$select count(*)::text from public.waitlist_throttle where sender='expired'$$, '0');
-- Fixture rows fill the real cap, avoiding replacement of a production helper.
insert into public.waitlist (email, group_size, expected_storage, willingness_to_pay)
  select 'cap-' || i || '@example.test', 1, '1_10gb', 10
    from generate_series(1, public.max_waitlist_rows() - (select count(*)::integer from public.waitlist)) i;
select odtest.as_anon();
select odtest.waitlist_error('full waitlist refuses a new address', $$select public.join_waitlist('full@example.test',1,'under_1gb',0)$$, 'WAITLIST_FULL');
select odtest.waitlist_error('full waitlist does not expose duplicate membership', $$select public.join_waitlist('waitlist@example.test',1,'under_1gb',0)$$, 'WAITLIST_FULL');
select set_config('request.headers', '{"cf-connecting-ip":"203.0.113.40"}', false);
select odtest.waitlist_error('rate limit precedes full cap', $$select public.join_waitlist('full@example.test',1,'under_1gb',0)$$, 'RATE_LIMITED');
select set_config('request.headers', '', false);

select odtest.as_owner();
\o
select * from odtest.report() where outcome='FAIL';
do $$ begin
  if exists (select 1 from odtest.results where not passed) then
    raise exception 'Control-plane security regression failures: %',
      (select string_agg(name, '; ') from odtest.results where not passed);
  end if;
end $$;
