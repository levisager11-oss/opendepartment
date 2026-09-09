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
  $$select public.delete_file('f1000000-0000-0000-0000-000000000004', 'owner request')
      ->> 'storage_path'$$,
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
  $$select public.delete_file('f1000000-0000-0000-0000-000000000002', 'moderation')
      ->> 'storage_path'$$,
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
-- Leaving: a member erases their own membership, and the last administrator
-- may not erase the one account that can still moderate the archive.
select odtest.as_owner();
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id,email) values
  ('a1000000-0000-0000-0000-000000000010','audit-leaver@example.test'),
  ('a1000000-0000-0000-0000-000000000011','audit-second-admin@example.test');
insert into public.profiles (id,username,is_admin,is_banned) values
  ('a1000000-0000-0000-0000-000000000010','auditleaver',false,false),
  ('a1000000-0000-0000-0000-000000000011','auditsecond',true,false);
alter table auth.users enable trigger on_auth_user_created;
insert into public.files
  (id,owner_id,title,storage_path,original_name,mime_type,size_bytes,kind)
values ('f1000000-0000-0000-0000-000000000010','a1000000-0000-0000-0000-000000000010',
  'Leaver exhibit','a1000000-0000-0000-0000-000000000010/leaving.png','leaving.png','image/png',10,'image');
insert into public.comments (file_id,author_id,body) values
  ('f1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000010','A parting word');

select odtest.as_anon();
select odtest.denied('a signed-out caller cannot reach leave_department',
  $$select public.leave_department('auditleaver')$$);

select odtest.as_user('a1000000-0000-0000-0000-000000000003');
select odtest.denied('a banned member cannot use leaving to erase their trail',
  $$select public.leave_department('auditbanned')$$);

select odtest.as_user('a1000000-0000-0000-0000-000000000010');
select odtest.denied('leaving refuses a confirmation that is not the caller name',
  $$select public.leave_department('auditadmin')$$);
select odtest.equals('a refused confirmation leaves the membership intact',
  $$select count(*)::text from public.profiles where id='a1000000-0000-0000-0000-000000000010'$$,'1');
select odtest.equals('leaving hands back the storage paths it did not delete',
  $$select public.leave_department('auditleaver') -> 'storage_paths' ->> 0$$,
  'a1000000-0000-0000-0000-000000000010/leaving.png');

select odtest.as_owner();
select odtest.equals('leaving removes the profile',
  $$select count(*)::text from public.profiles where id='a1000000-0000-0000-0000-000000000010'$$,'0');
select odtest.equals('leaving removes the private e-mail row',
  $$select count(*)::text from public.user_emails where user_id='a1000000-0000-0000-0000-000000000010'$$,'0');
select odtest.equals('leaving removes the documents that were filed',
  $$select count(*)::text from public.files where owner_id='a1000000-0000-0000-0000-000000000010'$$,'0');
select odtest.equals('leaving removes the comments that were written',
  $$select count(*)::text from public.comments where author_id='a1000000-0000-0000-0000-000000000010'$$,'0');
select odtest.equals('leaving removes the account itself',
  $$select count(*)::text from auth.users where id='a1000000-0000-0000-0000-000000000010'$$,'0');
select odtest.equals('the audit trail outlives the member who left',
  $$select count(*)::text from public.audit_log where action='member.leave'$$,'1');

-- An administrator may leave while another one remains. Earlier sections of
-- the suite share this database and left administrators of their own behind,
-- so the count is what makes this assertion mean something rather than the
-- two accounts named here.
select odtest.as_user('a1000000-0000-0000-0000-000000000011');
select odtest.allowed('an administrator may leave while another one remains',
  $$select public.leave_department('auditsecond')$$);

-- The floor itself needs a department with exactly one administrator left, and
-- this one has several. Demoting the others as the owner is fixture work, not
-- the property under test -- admin_set_flag() is exercised for that on its own
-- below.
select odtest.as_owner();
update public.profiles set is_admin = false
 where is_admin and id <> 'a1000000-0000-0000-0000-000000000001';
select odtest.equals('the fixture leaves exactly one administrator standing',
  $$select count(*)::text from public.profiles where is_admin and not is_banned$$,'1');
select odtest.as_user('a1000000-0000-0000-0000-000000000001');
select odtest.denied('the last administrator may not leave the department unmoderated',
  $$select public.leave_department('auditadmin')$$);
select odtest.as_owner();
select odtest.equals('the refused departure leaves the last administrator in place',
  $$select count(*)::text from public.profiles where id='a1000000-0000-0000-0000-000000000001' and is_admin$$,'1');
select odtest.equals('the refused departure leaves their documents in place',
  $$select count(*)::text from public.files where owner_id='a1000000-0000-0000-0000-000000000001'$$,'1');

-- Demotion still works when somebody is left to do the moderating, which is
-- the half of admin_set_flag() the new outcome check must not have broken.
select odtest.as_owner();
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id,email) values
  ('a1000000-0000-0000-0000-000000000012','audit-third-admin@example.test');
insert into public.profiles (id,username,is_admin,is_banned) values
  ('a1000000-0000-0000-0000-000000000012','auditthird',true,false);
alter table auth.users enable trigger on_auth_user_created;
select odtest.as_user('a1000000-0000-0000-0000-000000000012');
select odtest.allowed('an administrator may still demote a colleague',
  $$select public.admin_set_flag('a1000000-0000-0000-0000-000000000001','is_admin',false)$$);
select odtest.allowed('an administrator may still ban a colleague',
  $$select public.admin_set_flag('a1000000-0000-0000-0000-000000000002','is_banned',true)$$);
select odtest.as_owner();
select odtest.equals('the demotion landed',
  $$select is_admin::text from public.profiles where id='a1000000-0000-0000-0000-000000000001'$$,'false');

-- What a member says a file weighs is not what it weighs. Every number drawn
-- from size_bytes -- the cap, the administration screen's storage meter, the
-- per-member breakdown -- believed the browser until this was measured.
select odtest.as_owner();
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id,email) values
  ('a1000000-0000-0000-0000-000000000040','audit-weights@example.test');
insert into public.profiles (id,username,is_admin,is_banned) values
  ('a1000000-0000-0000-0000-000000000040','auditweights',false,false);
alter table auth.users enable trigger on_auth_user_created;
insert into storage.objects (bucket_id,name,metadata) values
  ('department-files','a1000000-0000-0000-0000-000000000040/heavy.png',
   jsonb_build_object('size', 40000000));

-- No `id` in these inserts: it is outside the authenticated INSERT grant on
-- purpose, so a caller cannot choose one. The rows are found by their path.
select odtest.as_user('a1000000-0000-0000-0000-000000000040');
select odtest.allowed('a file may be filed with a size the browser guessed at',
  $$insert into public.files
      (owner_id,title,storage_path,original_name,mime_type,size_bytes,kind)
    values (auth.uid(),'Heavy scan',
      auth.uid()::text||'/heavy.png','heavy.png','image/png',1,'image')$$);
select odtest.as_owner();
select odtest.equals('the stored size is the object, not the claim',
  $$select size_bytes::text from public.files
     where storage_path='a1000000-0000-0000-0000-000000000040/heavy.png'$$,'40000000');
-- As an administrator who is still one: admin_storage_usage() re-checks that,
-- and the owner role has no auth.uid() at all.
select odtest.as_user('a1000000-0000-0000-0000-000000000012');
select odtest.equals('the administration screen totals the measured bytes',
  $$select bytes::text from public.admin_storage_usage()
     where owner_id='a1000000-0000-0000-0000-000000000040'$$,'40000000');

-- The cap is now enforced against what is really there, so understating a file
-- no longer buys room under it. Fixtures as the owner: the storage policy only
-- lets a member write into their own folder, which the assertion above left as
-- somebody else's session.
select odtest.as_owner();
update public.settings set max_member_storage_mb = 50 where id;
insert into storage.objects (bucket_id,name,metadata) values
  ('department-files','a1000000-0000-0000-0000-000000000040/heavier.png',
   jsonb_build_object('size', 30000000));
select odtest.as_user('a1000000-0000-0000-0000-000000000040');
select odtest.denied('understating a second file does not get past the cap',
  $$insert into public.files
      (owner_id,title,storage_path,original_name,mime_type,size_bytes,kind)
    values (auth.uid(),'Heavier scan',
      auth.uid()::text||'/heavier.png','heavier.png','image/png',1,'image')$$);

-- A row whose object is not there yet keeps the claimed number rather than
-- failing: the measurement is an improvement on trust, not a precondition.
select odtest.allowed('a file whose object cannot be measured still files',
  $$insert into public.files
      (owner_id,title,storage_path,original_name,mime_type,size_bytes,kind)
    values (auth.uid(),'Unmeasured',
      auth.uid()::text||'/absent.png','absent.png','image/png',5,'image')$$);
select odtest.as_owner();
select odtest.equals('an unmeasurable file keeps the size it was given',
  $$select size_bytes::text from public.files
     where storage_path='a1000000-0000-0000-0000-000000000040/absent.png'$$,'5');
update public.settings set max_member_storage_mb = null where id;

-- Thumbnails are objects too: every path that removes an exhibit has to hand
-- back the small copy beside it, and the orphan sweep must not offer a live one
-- for deletion. A thumbnail left behind is readable by every member, because
-- the storage read policy is bucket-wide.
select odtest.as_owner();
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id,email) values
  ('a1000000-0000-0000-0000-000000000020','audit-thumbs@example.test');
insert into public.profiles (id,username,is_admin,is_banned) values
  ('a1000000-0000-0000-0000-000000000020','auditthumbs',false,false);
alter table auth.users enable trigger on_auth_user_created;
insert into public.files
  (id,owner_id,title,storage_path,thumb_path,original_name,mime_type,size_bytes,kind)
values ('f1000000-0000-0000-0000-000000000030','a1000000-0000-0000-0000-000000000020',
  'Illustrated exhibit',
  'a1000000-0000-0000-0000-000000000020/full.png',
  'a1000000-0000-0000-0000-000000000020/full-thumb.webp',
  'full.png','image/png',10,'image');
insert into storage.objects (bucket_id,name,created_at) values
  ('department-files','a1000000-0000-0000-0000-000000000020/full.png',now()-interval '2 hours'),
  ('department-files','a1000000-0000-0000-0000-000000000020/full-thumb.webp',now()-interval '2 hours');

-- auditthird, not auditadmin: the section above demoted auditadmin, and
-- admin_orphaned_objects() refuses a caller who is not an administrator.
select odtest.as_user('a1000000-0000-0000-0000-000000000012');
select odtest.equals('a live thumbnail is not offered to the orphan sweep',
  $$select count(*)::text from public.admin_orphaned_objects()
     where path like '%full-thumb.webp'$$,'0');

select odtest.as_user('a1000000-0000-0000-0000-000000000020');
select odtest.denied('a thumbnail cannot point into another member folder',
  $$insert into public.files
      (owner_id,title,storage_path,thumb_path,original_name,mime_type,size_bytes,kind)
    values (auth.uid(),'Borrowed thumbnail',
      auth.uid()::text||'/mine.png',
      'a1000000-0000-0000-0000-000000000001/theirs.webp',
      'mine.png','image/png',10,'image')$$);
select odtest.equals('deleting an exhibit hands back both objects to remove',
  $$select jsonb_array_length(
      public.delete_file('f1000000-0000-0000-0000-000000000030') -> 'storage_paths')::text$$,
  '2');
select odtest.as_owner();
select odtest.equals('the removed exhibit leaves its thumbnail to the caller, not the sweep',
  $$select count(*)::text from public.files
     where thumb_path='a1000000-0000-0000-0000-000000000020/full-thumb.webp'$$,'0');
select odtest.as_user('a1000000-0000-0000-0000-000000000012');
select odtest.equals('an unreferenced thumbnail becomes an orphan once its row is gone',
  $$select count(*)::text from public.admin_orphaned_objects()
     where path like '%full-thumb.webp'$$,'1');

-- Leaving takes both objects too.
select odtest.as_owner();
insert into public.files
  (id,owner_id,title,storage_path,thumb_path,original_name,mime_type,size_bytes,kind)
values ('f1000000-0000-0000-0000-000000000031','a1000000-0000-0000-0000-000000000020',
  'Second illustrated exhibit',
  'a1000000-0000-0000-0000-000000000020/second.png',
  'a1000000-0000-0000-0000-000000000020/second-thumb.webp',
  'second.png','image/png',10,'image');
select odtest.as_user('a1000000-0000-0000-0000-000000000020');
select odtest.equals('leaving hands back a thumbnail as well as its original',
  $$select jsonb_array_length(
      public.leave_department('auditthumbs') -> 'storage_paths')::text$$,'2');

-- A member's private address follows the one they actually confirmed. The
-- fixtures above insert profiles directly with the signup trigger disabled, so
-- the row handle_new_user() would have written has to be arranged here.
select odtest.as_owner();
insert into public.user_emails (user_id, email) values
  ('a1000000-0000-0000-0000-000000000002','audit-member@example.test')
on conflict (user_id) do update set email = excluded.email;
update auth.users set email='audit-member-new@example.test'
 where id='a1000000-0000-0000-0000-000000000002';
select odtest.equals('changing an address in Auth updates the private row',
  $$select email from public.user_emails
     where user_id='a1000000-0000-0000-0000-000000000002'$$,
  'audit-member-new@example.test');
select odtest.equals('the administration screen sees the new address, not the old one',
  $$select count(*)::text from public.user_emails
     where email='audit-member@example.test'$$,'0');
-- Blocked by having no UPDATE policy rather than by a revoked privilege, so
-- this is the silent shape: it succeeds and changes nothing.
select odtest.as_user('a1000000-0000-0000-0000-000000000002');
select odtest.touches_nothing('a member still cannot rewrite their own private address row',
  $$update public.user_emails set email='forged@example.test' where user_id=auth.uid()$$);
select odtest.as_owner();
select odtest.equals('the private address survives the attempt',
  $$select email from public.user_emails
     where user_id='a1000000-0000-0000-0000-000000000002'$$,
  'audit-member-new@example.test');

-- Search and subject filtering. Both moved into the database so the browser
-- stops building filter syntax out of a search term and stops fetching an id
-- list that grows with the archive.
select odtest.as_owner();
insert into public.subjects (id, name) values
  ('50000000-0000-0000-0000-000000000001','Audit subject');
insert into public.files
  (id, owner_id, title, description, storage_path, original_name, mime_type, size_bytes, kind)
values ('f1000000-0000-0000-0000-000000000020','a1000000-0000-0000-0000-000000000001',
  'Departmental budget', 'Quarterly figures, redacted',
  'a1000000-0000-0000-0000-000000000001/budget.pdf','budget.pdf','application/pdf',10,'pdf');
insert into public.file_subjects (file_id, subject_id) values
  ('f1000000-0000-0000-0000-000000000020','50000000-0000-0000-0000-000000000001');

select odtest.equals('the search vector is generated from title, description and filename',
  $$select (search @@ websearch_to_tsquery('simple','budget')
       and search @@ websearch_to_tsquery('simple','redacted')
       and search @@ websearch_to_tsquery('simple','pdf'))::text
      from public.files where id='f1000000-0000-0000-0000-000000000020'$$,'true');
-- Whole words, not substrings: the old ilike matched 'art' inside 'Department'.
select odtest.equals('search matches words rather than substrings',
  $$select (search @@ websearch_to_tsquery('simple','artment'))::text
      from public.files where id='f1000000-0000-0000-0000-000000000020'$$,'false');
-- A term is a value now, so punctuation is data and not syntax.
select odtest.equals('a term full of filter punctuation is a search, not an error',
  $$select count(*)::text from public.files
     where search @@ websearch_to_tsquery('simple','(budget), 50%')$$,'0');
select odtest.equals('punctuation around a real term is stripped rather than breaking it',
  $$select count(*)::text from public.files
     where search @@ websearch_to_tsquery('simple','(budget)')$$,'1');
-- The filename is split on its punctuation, so an extension is a word.
select odtest.equals('a document is reachable by a word in its filename',
  $$select (search @@ websearch_to_tsquery('simple','pdf'))::text
      from public.files where id='f1000000-0000-0000-0000-000000000020'$$,'true');
select odtest.equals('the generated column follows an edit',
  $$update public.files set title='Renamed entirely'
     where id='f1000000-0000-0000-0000-000000000020';
    select (search @@ websearch_to_tsquery('simple','renamed'))::text
      from public.files where id='f1000000-0000-0000-0000-000000000020'$$,'true');

select odtest.as_user('a1000000-0000-0000-0000-000000000001');
select odtest.equals('the vault view carries the subject ids the filter needs',
  $$select subject_ids[1]::text from public.files_public
     where id='f1000000-0000-0000-0000-000000000020'$$,
  '50000000-0000-0000-0000-000000000001');
select odtest.equals('filtering by subject finds the document without an id list',
  $$select count(*)::text from public.files_public
     where subject_ids @> array['50000000-0000-0000-0000-000000000001'::uuid]$$,'1');
select odtest.as_user('a1000000-0000-0000-0000-000000000003');
select odtest.equals('a banned member searches nothing, the view still being RLS-bound',
  $$select count(*)::text from public.files_public
     where search @@ websearch_to_tsquery('simple','renamed')$$,'0');

-- The version stamp. It is what tells an administrator there is something to
-- re-run, so it has to be present, correct, readable through the front door's
-- own function, and not something a member can rewrite to silence the notice.
select odtest.as_owner();
select odtest.equals('applying the schema records exactly one version row',
  $$select count(*)::text from public.schema_version$$,'1');
select odtest.equals('the recorded version matches the stamp at the end of the file',
  $$select version::text from public.schema_version where id$$,'4');
select odtest.equals('re-running the file does not accumulate version rows',
  $$select count(*)::text from public.schema_version$$,'1');

select odtest.as_anon();
select odtest.denied('a signed-out caller cannot read the version table directly',
  $$select * from public.schema_version$$);
select odtest.equals('the front door still reports the version without a session',
  $$select schema_version::text from public.department_identity()$$,'4');

select odtest.as_user('a1000000-0000-0000-0000-000000000002');
select odtest.denied('a member cannot read the version table directly',
  $$select * from public.schema_version$$);
select odtest.denied('a member cannot forge a version to silence the update notice',
  $$update public.schema_version set version = 999 where id$$);
select odtest.as_user('a1000000-0000-0000-0000-000000000012');
select odtest.denied('an administrator cannot forge a version either',
  $$update public.schema_version set version = 999 where id$$);
select odtest.denied('an administrator cannot delete the version row',
  $$delete from public.schema_version where id$$);
select odtest.as_owner();
select odtest.equals('the version survives every attempt to rewrite it',
  $$select version::text from public.schema_version where id$$,'4');

select odtest.as_owner();
\o
select * from odtest.report() where outcome='FAIL';
do $$ begin
  if exists (select 1 from odtest.results where not passed) then
    raise exception 'Tenant security regression failures: %',
      (select string_agg(name, '; ') from odtest.results where not passed);
  end if;
end $$;
