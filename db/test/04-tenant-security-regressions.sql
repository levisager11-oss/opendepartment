-- Direct API attacks found by the static audit. Run after 02-rls-tests.sql.
\set ON_ERROR_STOP on
\o /dev/null
select odtest.as_owner();
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, email) values
  ('a1000000-0000-0000-0000-000000000001', 'audit-admin@example.test'),
  ('a1000000-0000-0000-0000-000000000002', 'audit-member@example.test'),
  ('a1000000-0000-0000-0000-000000000003', 'audit-banned@example.test');
insert into public.profiles (id, username, is_admin, is_banned) values
  ('a1000000-0000-0000-0000-000000000001', 'auditadmin', true, false),
  ('a1000000-0000-0000-0000-000000000002', 'auditmember', false, false),
  ('a1000000-0000-0000-0000-000000000003', 'auditbanned', false, true);
alter table auth.users enable trigger on_auth_user_created;
insert into public.files
  (id, owner_id, title, storage_path, original_name, mime_type, size_bytes, kind)
values
  ('f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Protected member file', 'a1000000-0000-0000-0000-000000000002/protected.png', 'protected.png', 'image/png', 10, 'image'),
  ('f1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'Banned owner file', 'a1000000-0000-0000-0000-000000000003/banned.png', 'banned.png', 'image/png', 10, 'image'),
  ('f1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Admin file', 'a1000000-0000-0000-0000-000000000001/admin.png', 'admin.png', 'image/png', 10, 'image'),
  ('f1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'Owner cleanup', 'a1000000-0000-0000-0000-000000000002/cleanup.png', 'cleanup.png', 'image/png', 10, 'image');
insert into storage.objects (bucket_id,name) values
  ('department-files','a1000000-0000-0000-0000-000000000002/cleanup.png');

select odtest.as_anon();
select odtest.denied('anonymous delete_file cannot exploit NULL ownership',
  $$select public.delete_file('f1000000-0000-0000-0000-000000000001')$$);
select odtest.as_owner();
select odtest.equals('anonymous deletion leaves the exhibit intact',
  $$select count(*)::text from public.files where id='f1000000-0000-0000-0000-000000000001'$$, '1');

select odtest.as_user('a1000000-0000-0000-0000-000000000003');
select odtest.denied('banned owner cannot call delete_file',
  $$select public.delete_file('f1000000-0000-0000-0000-000000000002')$$);
select odtest.touches_nothing('banned owner cannot delete files through the direct table API',
  $$delete from public.files$$);
select odtest.touches_nothing('banned member cannot rename their profile directly',
  $$update public.profiles set username='afterban' where id=auth.uid()$$);
select odtest.as_owner();
select odtest.equals('banned deletion leaves the exhibit intact',
  $$select count(*)::text from public.files where id='f1000000-0000-0000-0000-000000000002'$$, '1');

select odtest.as_user('a1000000-0000-0000-0000-000000000002');
select odtest.denied('member cannot delete another owners file through the RPC',
  $$select public.delete_file('f1000000-0000-0000-0000-000000000003')$$);
select odtest.equals('owner deletion returns the path needed for storage cleanup',
  $$select public.delete_file('f1000000-0000-0000-0000-000000000004', 'owner request')$$,
  'a1000000-0000-0000-0000-000000000002/cleanup.png');
select odtest.allowed('owner can still remove the storage object after RPC deletion',
  $$delete from storage.objects where bucket_id='department-files'
    and name='a1000000-0000-0000-0000-000000000002/cleanup.png'$$);
select odtest.equals('storage cleanup removes the returned object',
  $$select count(*)::text from storage.objects where bucket_id='department-files'
    and name='a1000000-0000-0000-0000-000000000002/cleanup.png'$$,'0');
select odtest.denied('direct username update rejects whitespace',
  $$update public.profiles set username='misleading name' where id=auth.uid()$$);
select odtest.denied('direct username update rejects overlong names',
  $$update public.profiles set username=repeat('a', 21) where id=auth.uid()$$);
select odtest.allowed('active member can still change to a valid username',
  $$update public.profiles set username='audit_member2' where id=auth.uid()$$);

-- Every protected INSERT operation is independent: defaults must be trusted,
-- even when the caller names a different metadata or counter column.
do $tests$
declare field text; value text;
begin
  foreach field in array array['upvotes','downvotes','score','comment_count','report_count','view_count','case_number','created_at'] loop
    value := case when field='created_at' then quote_literal('2099-01-01') else '9999' end;
    perform odtest.denied('file insert cannot forge ' || field,
      format('insert into public.files (owner_id,title,storage_path,original_name,mime_type,size_bytes,kind,%I) values (auth.uid(),%L,auth.uid()::text || %L,%L,%L,1,%L,%s)',
        field, 'Forged', '/forged-' || field || '.png', 'forged.png', 'image/png', 'image', value));
  end loop;
end $tests$;
select odtest.allowed('file insertion still accepts ordinary uploader fields',
  $$insert into public.files (owner_id,title,description,category,storage_path,original_name,mime_type,size_bytes,kind)
    values (auth.uid(),'Ordinary','Description','EXHIBIT',auth.uid()::text || '/ordinary.png','ordinary.png','image/png',20,'image')$$);

-- An unrelated administrator-owned file survives all denial cases above.
select odtest.denied('report requires a file or comment target',
  $$insert into public.reports (reporter_id,reason) values (auth.uid(),'other')$$);
select odtest.allowed('member can create a comment to report',
  $$insert into public.comments (id,file_id,author_id,body) values
    ('c1000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000003',auth.uid(),'Comment under review')$$);
select odtest.denied('report cannot ambiguously name both a file and a comment',
  $$insert into public.reports (file_id,comment_id,reporter_id,reason) values
    ('f1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001',auth.uid(),'other')$$);
select odtest.allowed('member can report a comment once',
  $$insert into public.reports (comment_id,reporter_id,reason) values
    ('c1000000-0000-0000-0000-000000000001',auth.uid(),'harassment')$$);
select odtest.denied('member cannot duplicate a comment report',
  $$insert into public.reports (comment_id,reporter_id,reason) values
    ('c1000000-0000-0000-0000-000000000001',auth.uid(),'personal')$$);
do $tests$
declare field text; value text;
begin
  foreach field in array array['status','created_at','resolved_at','resolved_by'] loop
    value := case
      when field='status' then quote_literal('resolved')
      when field='resolved_by' then quote_literal('a1000000-0000-0000-0000-000000000001')
      else quote_literal('2099-01-01') end;
    perform odtest.denied('report insert cannot forge ' || field,
      format('insert into public.reports (file_id,reporter_id,reason,%I) values (%L,auth.uid(),%L,%s)',
        field, 'f1000000-0000-0000-0000-000000000003', 'other', value));
  end loop;
end $tests$;
select odtest.allowed('ordinary file report is still accepted',
  $$insert into public.reports (file_id,reporter_id,reason,details) values
    ('f1000000-0000-0000-0000-000000000003',auth.uid(),'illegal','Details')$$);
select odtest.equals('new report begins unresolved and open',
  $$select (status='open' and resolved_at is null and resolved_by is null)::text
    from public.reports where file_id='f1000000-0000-0000-0000-000000000003' and reporter_id=auth.uid()$$, 'true');

select odtest.as_user('a1000000-0000-0000-0000-000000000001');
select odtest.allowed('administrator can still resolve a report',
  $$update public.reports set status='resolved',resolved_by=auth.uid(),resolved_at=now()
    where file_id='f1000000-0000-0000-0000-000000000003'$$);
select odtest.equals('administrator can delete another owners exhibit and clean storage',
  $$select public.delete_file('f1000000-0000-0000-0000-000000000002', 'moderation')$$,
  'a1000000-0000-0000-0000-000000000003/banned.png');
select odtest.as_owner();
select odtest.equals('owner deletion is attributed in the audit log',
  $$select actor_id::text from public.audit_log where action='file.delete'
    and target='f1000000-0000-0000-0000-000000000004'$$,
  'a1000000-0000-0000-0000-000000000002');

-- Even the first signup must prove it is the founder selected during setup.
update public.settings set claimed=false where id;
select odtest.denied('unclaimed department refuses a signup without founder proof',
  $$insert into auth.users (email) values ('uninvited-founder@example.test')$$);
insert into public.department_bootstrap (id,secret_hash)
values (true,encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex'));
select odtest.denied('unclaimed department refuses an invented founder proof',
  $$insert into auth.users (email,raw_user_meta_data) values
    ('forged-founder@example.test', jsonb_build_object('bootstrap_secret',repeat('b',64)))$$);
select odtest.as_anon();
select odtest.denied('anonymous caller cannot read the founder verifier',
  $$select * from public.department_bootstrap$$);
select odtest.as_user('a1000000-0000-0000-0000-000000000001');
select odtest.denied('tenant administrator cannot read the founder verifier over the API',
  $$select * from public.department_bootstrap$$);
select odtest.denied('tenant administrator cannot replace the founder verifier over the API',
  $$update public.department_bootstrap set secret_hash=repeat('b',64) where id$$);
select odtest.as_owner();
select odtest.allowed('valid founder proof creates the initial administrator',
  $$insert into auth.users (id,email,raw_user_meta_data) values
    ('a1000000-0000-0000-0000-000000000004','valid-founder@example.test',
     jsonb_build_object('bootstrap_secret',repeat('a',64)))$$);
select odtest.equals('the authorized founder receives administrator rights',
  $$select is_admin::text from public.profiles where id='a1000000-0000-0000-0000-000000000004'$$,'true');
select odtest.equals('successful founding consumes the verifier',
  $$select count(*)::text from public.department_bootstrap$$,'0');
select odtest.equals('successful founding removes the raw secret from Auth metadata',
  $$select (not (raw_user_meta_data ? 'bootstrap_secret'))::text from auth.users
    where id='a1000000-0000-0000-0000-000000000004'$$,'true');
select odtest.equals('successful founding marks the department claimed',
  $$select claimed::text from public.settings where id$$,'true');
select odtest.denied('the consumed founder proof cannot admit another signup',
  $$insert into auth.users (email,raw_user_meta_data) values
    ('replayed-founder@example.test',jsonb_build_object('bootstrap_secret',repeat('a',64)))$$);
-- Cleanup must leave a newly uploaded object time to acquire its file row.
select odtest.as_owner();
insert into storage.objects (bucket_id,name,created_at) values
  ('department-files','a1000000-0000-0000-0000-000000000001/old-orphan.png',now()-interval '2 hours'),
  ('department-files','a1000000-0000-0000-0000-000000000001/new-upload.png',now()),
  ('department-files','a1000000-0000-0000-0000-000000000002/ordinary.png',now()-interval '2 hours');
select odtest.as_user('a1000000-0000-0000-0000-000000000001');
select odtest.equals('orphan cleanup includes old unreferenced objects',
  $$select count(*)::text from public.admin_orphaned_objects() where path like '%/old-orphan.png'$$,'1');
select odtest.equals('orphan cleanup protects a recent upload awaiting metadata',
  $$select count(*)::text from public.admin_orphaned_objects() where path like '%/new-upload.png'$$,'0');
select odtest.equals('orphan cleanup protects old referenced objects',
  $$select count(*)::text from public.admin_orphaned_objects() where path like '%/ordinary.png'$$,'0');
select odtest.as_owner();
\o
select * from odtest.report() where outcome='FAIL';
do $$ begin
  if exists (select 1 from odtest.results where not passed) then
    raise exception 'Tenant security regression failures: %',
      (select string_agg(name, '; ') from odtest.results where not passed);
  end if;
end $$;
