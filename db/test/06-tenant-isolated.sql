-- Sections that need to reason about TOTALS, or about who holds a role, run
-- here: this file gets a database with nothing in it but the schema, so a
-- count means what it says.
--
-- 02 and 04 share one database and are written against each other's fixtures.
-- That is fine for "can this role do this thing", which is most of the suite,
-- and wrong for "how many of these are there" -- which is how two assertions
-- in this repo came to be written against numbers another file had put there.
\set ON_ERROR_STOP on
\o /dev/null

-- A department with exactly one administrator, which is what a real one looks
-- like on its first day.
select odtest.as_owner();
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, email) values
  ('c1000000-0000-0000-0000-000000000001', 'founder@example.test'),
  ('c1000000-0000-0000-0000-000000000002', 'member@example.test');
insert into public.profiles (id, username, is_admin, is_banned) values
  ('c1000000-0000-0000-0000-000000000001', 'founder', true, false),
  ('c1000000-0000-0000-0000-000000000002', 'member', false, false);
alter table auth.users enable trigger on_auth_user_created;

select odtest.equals('a fresh department has exactly one administrator',
  $$select count(*)::text from public.profiles where is_admin and not is_banned$$, '1');

-- The floor, without arranging it first. This is the assertion that had to
-- demote three unrelated administrators to mean anything in the shared file.
select odtest.as_user('c1000000-0000-0000-0000-000000000001');
select odtest.denied('the only administrator cannot leave',
  $$select public.leave_department('founder')$$);
select odtest.denied('the only administrator cannot demote themselves',
  $$select public.admin_set_flag('c1000000-0000-0000-0000-000000000001','is_admin',false)$$);
select odtest.allowed('promoting somebody else is how the floor is raised',
  $$select public.admin_set_flag('c1000000-0000-0000-0000-000000000002','is_admin',true)$$);
select odtest.allowed('and then the first one may go',
  $$select public.leave_department('founder')$$);
select odtest.as_owner();
select odtest.equals('the department still has an administrator afterwards',
  $$select count(*)::text from public.profiles where is_admin and not is_banned$$, '1');

-- Storage totals, which only mean something when nothing else has uploaded.
select odtest.as_owner();
insert into storage.objects (bucket_id, name, metadata) values
  ('department-files','c1000000-0000-0000-0000-000000000002/one.png',
   jsonb_build_object('size', 1500000)),
  ('department-files','c1000000-0000-0000-0000-000000000002/two.png',
   jsonb_build_object('size', 2500000));
select odtest.as_user('c1000000-0000-0000-0000-000000000002');
select odtest.allowed('a member files two documents, understating both',
  $$insert into public.files
      (owner_id,title,storage_path,original_name,mime_type,size_bytes,kind)
    values (auth.uid(),'One',auth.uid()::text||'/one.png','one.png','image/png',1,'image'),
           (auth.uid(),'Two',auth.uid()::text||'/two.png','two.png','image/png',1,'image')$$);
select odtest.equals('the department totals the measured bytes, not the claimed ones',
  $$select bytes::text from public.admin_storage_usage()
     where owner_id='c1000000-0000-0000-0000-000000000002'$$, '4000000');
select odtest.equals('and counts the documents it actually holds',
  $$select files::text from public.admin_storage_usage()
     where owner_id='c1000000-0000-0000-0000-000000000002'$$, '2');
select odtest.equals('the front door reports the same two',
  $$select files::text from public.department_stats()$$, '2');

select odtest.as_owner();
\o
select * from odtest.report() where outcome='FAIL';
do $$ begin
  if exists (select 1 from odtest.results where not passed) then
    raise exception 'Isolated tenant failures: %',
      (select string_agg(name, '; ') from odtest.results where not passed);
  end if;
end $$;
