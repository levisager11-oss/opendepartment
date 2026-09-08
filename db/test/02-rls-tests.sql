-- ===========================================================================
--  OPENDEPARTMENT -- row level security suite
--
--  The whole authorisation model of a department is its RLS policies, its
--  column privileges and the is_admin() check inside each `security definer`
--  RPC. None of that is exercised by anything in the app, so this file is
--  where "an ordinary member cannot promote themselves" stops being a comment
--  in a .sql file and becomes something a machine checks.
--
--  Run it with db/test/run.sh -- it needs the shim in 00-shim.sql, so it wants
--  a scratch PostgreSQL instance, not your department's project.
-- ===========================================================================
\set ON_ERROR_STOP on
-- Only the report at the bottom is worth reading; every helper call returns a
-- row saying nothing.
\o /dev/null
truncate odtest.results;

-- Start from a known board. run.sh builds a fresh database, but the suite is
-- also worth being able to re-run in place while working on a policy.
alter table auth.users disable trigger on_auth_user_created;
delete from auth.users;
delete from public.invites;
update public.settings
   set claimed = false, open_join = false, accent = '#b8860b',
       max_upload_mb = 25, department_name = 'The Department'
 where id;

-- ---------------------------------------------------------------------------
-- Cast. The signup trigger is held off while these are created: only the first
-- account through the door founds a department and every later one needs an
-- invite, so leaving it armed would make the fixture a test of handle_new_user
-- rather than of the policies. Section 8 arms it again and tests it properly.
-- ---------------------------------------------------------------------------
alter table auth.users disable trigger on_auth_user_created;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'member@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'banned@example.test'),
  ('44444444-4444-4444-4444-444444444444', 'other@example.test'),
  ('55555555-5555-5555-5555-555555555555', 'rogue@example.test');

-- 5 is the one that matters below: an administrator who has since been
-- banned. Banning is the only lever one administrator has over another that
-- does not need the other to cooperate, so it has to take the rights away and
-- not merely the interface.
insert into public.profiles (id, username, is_admin, is_banned) values
  ('11111111-1111-1111-1111-111111111111', 'theadmin', true,  false),
  ('22222222-2222-2222-2222-222222222222', 'amember',  false, false),
  ('33333333-3333-3333-3333-333333333333', 'banished', false, true),
  ('44444444-4444-4444-4444-444444444444', 'somebody', false, false),
  ('55555555-5555-5555-5555-555555555555', 'therogue', true,  true);

insert into public.user_emails (user_id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'member@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'banned@example.test'),
  ('44444444-4444-4444-4444-444444444444', 'other@example.test'),
  ('55555555-5555-5555-5555-555555555555', 'rogue@example.test');

insert into public.files
  (id, owner_id, title, category, storage_path, original_name, mime_type,
   size_bytes, kind)
values
  ('aaaaaaaa-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222', 'A members exhibit', 'EXHIBIT',
   '22222222-2222-2222-2222-222222222222/one.png', 'one.png', 'image/png',
   1024, 'image'),
  ('aaaaaaaa-0000-0000-0000-000000000002',
   '33333333-3333-3333-3333-333333333333', 'Filed before the ban', 'EXHIBIT',
   '33333333-3333-3333-3333-333333333333/two.png', 'two.png', 'image/png',
   2048, 'image');

insert into public.invites (code, grants_admin) values ('SECRET-CODE-1', true);

-- ===========================================================================
--  1. THE ESCALATION EVERY TENANT SCHEMA CHANGE IS TRYING TO PREVENT
-- ===========================================================================
select odtest.as_user('22222222-2222-2222-2222-222222222222');

select odtest.denied('member cannot make themselves an admin',
  $$update public.profiles set is_admin = true where id = auth.uid()$$);

select odtest.denied('member cannot clear their own ban flag',
  $$update public.profiles set is_banned = false where id = auth.uid()$$);

select odtest.allowed('member CAN still change their own username',
  $$update public.profiles set username = 'renamed' where id = auth.uid()$$);

select odtest.denied('member cannot rewrite their own vote score',
  $$update public.files set score = 9999
     where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$);

select odtest.allowed('member CAN still retitle their own file',
  $$update public.files set title = 'Retitled'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$);

select odtest.touches_nothing('member cannot retitle somebody elses file',
  $$update public.files set title = 'Hijacked'
     where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$);
select odtest.as_owner();

-- ===========================================================================
--  2. ADMIN-ONLY SURFACES
-- ===========================================================================
select odtest.as_user('22222222-2222-2222-2222-222222222222');

select odtest.denied('member cannot call admin_list_members',
  $$select * from public.admin_list_members()$$);

select odtest.denied('member cannot call admin_set_flag',
  $$select public.admin_set_flag(
      '44444444-4444-4444-4444-444444444444', 'is_admin', true)$$);

select odtest.denied('member cannot read another members e-mail address',
  $$select public.admin_file_owner_email(
      'aaaaaaaa-0000-0000-0000-000000000001')$$);

select odtest.equals('member sees only their own row in user_emails',
  $$select count(*)::text from public.user_emails$$, '1');

select odtest.equals('member cannot see invite codes',
  $$select count(*)::text from public.invites$$, '0');

select odtest.equals('member cannot read the audit log',
  $$select count(*)::text from public.audit_log$$, '0');

select odtest.touches_nothing('member cannot rename the department',
  $$update public.settings set department_name = 'Hijacked' where id$$);
select odtest.as_owner();

-- ===========================================================================
--  3. THE SETTINGS COLUMN FENCE
--
--  `claimed` back to false makes handle_new_user() treat the next signup as
--  the one that founds the department: no invite code, instant administrator.
--  An administrator is allowed to rebrand; they are not allowed to reopen the
--  founding door or to put arbitrary text where CSS is rendered.
-- ===========================================================================
select odtest.as_user('11111111-1111-1111-1111-111111111111');

select odtest.denied('admin cannot un-claim the department',
  $$update public.settings set claimed = false where id$$);

select odtest.denied('admin cannot inject CSS through the accent colour',
  $$update public.settings
       set accent = 'red;background-image:url(https://evil.example/?c=)'
     where id$$);

select odtest.denied('admin cannot set a non-hex accent',
  $$update public.settings set accent = 'goldenrod' where id$$);

select odtest.denied('admin cannot raise the upload cap past the ceiling',
  $$update public.settings set max_upload_mb = 5000 where id$$);

select odtest.denied('admin cannot empty the category list',
  $$update public.settings set categories = '{}'::text[] where id$$);

select odtest.allowed('admin CAN still rebrand the department',
  $$update public.settings
       set department_name = 'The Renamed Files',
           accent          = '#123abc',
           max_upload_mb   = 30,
           open_join       = true
     where id$$);

select odtest.allowed('admin CAN still ban a member',
  $$select public.admin_set_flag(
      '44444444-4444-4444-4444-444444444444', 'is_banned', true)$$);

select odtest.equals('admin CAN read every members e-mail address',
  $$select count(*)::text from public.user_emails$$, '5');

-- A code may carry grants_admin, so a guessable one is not a weak password --
-- it is an unauthenticated route to every member's e-mail address. The screen
-- mints nine characters out of a 32-letter alphabet; nothing stopped an
-- administrator typing something else into the field, and `invites` is
-- admin-writable over PostgREST either way.
select odtest.denied('admin cannot mint a guessable invite code',
  $$insert into public.invites (code, grants_admin) values ('PARTY', true)$$);

-- handle_new_user() upper-cases the code it is handed before looking it up, so
-- a lower-case code is one nobody can ever redeem.
select odtest.denied('admin cannot mint a code nobody could redeem',
  $$insert into public.invites (code) values ('lower-case-code')$$);

select odtest.allowed('admin CAN still mint a proper invite code',
  $$insert into public.invites (code, grants_admin)
    values ('XKJ-4MN-7PQ', false)$$);

select odtest.as_owner();

-- ===========================================================================
--  4. A BANNED MEMBER
--
--  Being banned took away reading, but ownership alone still authorised
--  writing: they could retitle documents they could no longer see, and change
--  votes on them.
-- ===========================================================================
select odtest.as_user('33333333-3333-3333-3333-333333333333');

select odtest.equals('banned member sees no files',
  $$select count(*)::text from public.files$$, '0');

select odtest.denied('banned member cannot upload',
  $$insert into public.files
      (owner_id, title, category, storage_path, original_name, mime_type,
       size_bytes, kind)
    values (auth.uid(), 'Sneaked in', 'EXHIBIT', 'x/three.png', 'three.png',
            'image/png', 10, 'image')$$);

select odtest.touches_nothing('banned member cannot retitle their old file',
  $$update public.files set title = 'Still here'
     where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$);

select odtest.denied('banned member cannot vote through the table',
  $$insert into public.votes (file_id, user_id, value)
    values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 1)$$);

select odtest.denied('banned member cannot vote through cast_vote',
  $$select public.cast_vote(
      'aaaaaaaa-0000-0000-0000-000000000001', 1::smallint)$$);

select odtest.denied('banned member cannot comment',
  $$insert into public.comments (file_id, author_id, body)
    values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'hello')$$);

-- increment_view() returns void and swallows a non-member rather than raising,
-- so the assertion is on the counter, not on an exception.
select public.increment_view('aaaaaaaa-0000-0000-0000-000000000001');
select odtest.as_owner();

select odtest.equals('banned member cannot inflate a view counter',
  $$select view_count::text from public.files
     where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '0');

-- ===========================================================================
--  4b. A BANNED ADMINISTRATOR
--
--  is_admin() used to read the is_admin column alone, so banning an
--  administrator took away the interface and nothing else: requireMember()
--  sends them to /access-denied, but the department's anon key is in the page
--  source of its own front door and their session is still valid, so every
--  admin RPC remained one HTTP call away. A banned administrator could go on
--  reading every member's e-mail address, deleting other people's documents,
--  and banning whoever had just banned them.
--
--  These run as user 5, who is is_admin AND is_banned.
-- ===========================================================================
select odtest.as_user('55555555-5555-5555-5555-555555555555');

select odtest.equals('a ban reaches is_admin()',
  $$select public.is_admin()::text$$, 'false');

select odtest.denied('a banned admin cannot list members or their e-mails',
  $$select * from public.admin_list_members()$$);

select odtest.denied('a banned admin cannot look up a file owners e-mail',
  $$select public.admin_file_owner_email(
      'aaaaaaaa-0000-0000-0000-000000000001')$$);

select odtest.denied('a banned admin cannot delete somebody elses document',
  $$select public.delete_file('aaaaaaaa-0000-0000-0000-000000000001')$$);

select odtest.denied('a banned admin cannot ban the person who banned them',
  $$select public.admin_set_flag(
      '11111111-1111-1111-1111-111111111111', 'is_banned', true)$$);

select odtest.denied('a banned admin cannot promote an accomplice',
  $$select public.admin_set_flag(
      '44444444-4444-4444-4444-444444444444', 'is_admin', true)$$);

select odtest.touches_nothing('a banned admin cannot rebrand the department',
  $$update public.settings set department_name = 'Mine now' where id$$);

select odtest.denied('a banned admin cannot mint an invite code',
  $$insert into public.invites (code, grants_admin)
    values ('BACKDOOR-CODE', true)$$);

select odtest.equals('a banned admin reads no audit log',
  $$select count(*)::text from public.audit_log$$, '0');

select odtest.denied('a banned admin cannot rename themselves',
  $$select public.claim_username('notarogue')$$);

select odtest.as_owner();

-- ...and the department still has a working administrator. A fence that
-- locked out the un-banned one too would be a different bug.
select odtest.as_user('11111111-1111-1111-1111-111111111111');

select odtest.equals('an un-banned administrator is still an administrator',
  $$select public.is_admin()::text$$, 'true');

select odtest.allowed('an un-banned administrator can still list members',
  $$select * from public.admin_list_members()$$);

select odtest.as_owner();

-- ===========================================================================
--  5. A SIGNED-OUT VISITOR
--
--  Everything here is reachable with the department's anon key, which is in
--  the page source of its own front door. Only the two functions the front
--  door actually needs may answer.
-- ===========================================================================
select odtest.as_anon();

select odtest.equals('anon sees no files',    $$select count(*)::text from public.files$$,    '0');
select odtest.equals('anon sees no profiles', $$select count(*)::text from public.profiles$$, '0');
select odtest.equals('anon sees no comments', $$select count(*)::text from public.comments$$, '0');
select odtest.equals('anon sees no e-mails',  $$select count(*)::text from public.user_emails$$, '0');
select odtest.equals('anon sees no invites',  $$select count(*)::text from public.invites$$,  '0');
select odtest.equals('anon sees no settings', $$select count(*)::text from public.settings$$, '0');

select odtest.denied('anon cannot drive the view counter',
  $$select public.increment_view('aaaaaaaa-0000-0000-0000-000000000001')$$);

select odtest.denied('anon cannot vote',
  $$select public.cast_vote(
      'aaaaaaaa-0000-0000-0000-000000000001', 1::smallint)$$);

select odtest.denied('anon cannot list members',
  $$select * from public.admin_list_members()$$);

select odtest.allowed('anon CAN read the front door identity',
  $$select * from public.department_identity()$$);

select odtest.allowed('anon CAN read the front door counters',
  $$select * from public.department_stats()$$);
select odtest.as_owner();

-- ===========================================================================
--  6. WHAT A MEMBER MAY CLAIM ABOUT AN UPLOAD
-- ===========================================================================
select odtest.as_user('22222222-2222-2222-2222-222222222222');

select odtest.denied('a file cannot be filed under a type the app never renders',
  $$insert into public.files
      (owner_id, title, category, storage_path, original_name, mime_type,
       size_bytes, kind)
    values (auth.uid(), 'Payload', 'EXHIBIT', 'p/x.html', 'x.html',
            'text/html', 10, 'other')$$);

select odtest.denied('kind must agree with mime_type',
  $$insert into public.files
      (owner_id, title, category, storage_path, original_name, mime_type,
       size_bytes, kind)
    values (auth.uid(), 'Mislabelled', 'EXHIBIT', 'p/y.pdf', 'y.pdf',
            'application/pdf', 10, 'image')$$);

select odtest.denied('a file cannot claim an absurd size',
  $$insert into public.files
      (owner_id, title, category, storage_path, original_name, mime_type,
       size_bytes, kind)
    values (auth.uid(), 'Huge', 'EXHIBIT', 'p/z.png', 'z.png',
            'image/png', 999999999999, 'image')$$);

-- The path is the owner's folder, so this fails on the policy rather than on
-- the path fence below -- which is the property being tested here.
select odtest.denied('a file cannot be filed for somebody else',
  $$insert into public.files
      (owner_id, title, category, storage_path, original_name, mime_type,
       size_bytes, kind)
    values ('44444444-4444-4444-4444-444444444444', 'Framed', 'EXHIBIT',
            '44444444-4444-4444-4444-444444444444/w.png', 'w.png',
            'image/png', 10, 'image')$$);

-- ...and the row has to point at a path in the uploader's own folder. The
-- storage policy fences the OBJECT; nothing fenced the row that claims it.
select odtest.denied('a file row cannot claim a path outside its owners folder',
  $$insert into public.files
      (owner_id, title, category, storage_path, original_name, mime_type,
       size_bytes, kind)
    values (auth.uid(), 'Somebody elses object', 'EXHIBIT',
            '44444444-4444-4444-4444-444444444444/theirs.png', 'theirs.png',
            'image/png', 10, 'image')$$);

select odtest.allowed('an ordinary upload still goes through',
  $$insert into public.files
      (owner_id, title, category, storage_path, original_name, mime_type,
       size_bytes, kind)
    values (auth.uid(), 'Ordinary', 'EXHIBIT',
            auth.uid()::text || '/ok.png', 'ok.png',
            'image/png', 4096, 'image')$$);

-- ---------------------------------------------------------------------------
-- The per-member storage cap. Null means no cap, which is what a department
-- re-running the schema file gets, so the cap is set here to test it at all.
-- ---------------------------------------------------------------------------
select odtest.as_owner();
update public.settings set max_member_storage_mb = 1 where id;
select odtest.as_user('22222222-2222-2222-2222-222222222222');

select odtest.denied('a member cannot upload past their storage cap',
  $$insert into public.files
      (owner_id, title, category, storage_path, original_name, mime_type,
       size_bytes, kind)
    values (auth.uid(), 'Too big', 'EXHIBIT',
            auth.uid()::text || '/huge.png', 'huge.png',
            'image/png', 2097152, 'image')$$);

select odtest.allowed('a member CAN still upload under the cap',
  $$insert into public.files
      (owner_id, title, category, storage_path, original_name, mime_type,
       size_bytes, kind)
    values (auth.uid(), 'Small enough', 'EXHIBIT',
            auth.uid()::text || '/small.png', 'small.png',
            'image/png', 1024, 'image')$$);

select odtest.as_owner();
update public.settings set max_member_storage_mb = null where id;
select odtest.as_user('22222222-2222-2222-2222-222222222222');

-- One view per person per hour, rather than one per reload. The member has
-- already been counted on file 1 in section 4, so a second call must not move
-- the counter -- and the counter is read back as owner because a member may
-- not read the table it lives in past their own row.
select public.increment_view('aaaaaaaa-0000-0000-0000-000000000001');
select public.increment_view('aaaaaaaa-0000-0000-0000-000000000001');
select public.increment_view('aaaaaaaa-0000-0000-0000-000000000001');

-- An id that is not a file at all used to update nothing and now has a foreign
-- key under it, so it has to be turned away before the insert rather than by it.
select public.increment_view('aaaaaaaa-0000-0000-0000-00000000dead');

select odtest.as_owner();

select odtest.equals('three reloads count as one view',
  $$select view_count::text from public.files
     where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '1');

select odtest.as_user('22222222-2222-2222-2222-222222222222');

select odtest.equals('nobody can read who looked at what',
  $$select count(*)::text from public.file_views$$, '0');

select odtest.denied('a report cannot carry an invented reason',
  $$insert into public.reports (file_id, reporter_id, reason)
    values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(),
            'because-i-said-so')$$);

select odtest.allowed('an ordinary report still goes through',
  $$insert into public.reports (file_id, reporter_id, reason)
    values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'illegal')$$);

select odtest.denied('the same person cannot report the same file twice',
  $$insert into public.reports (file_id, reporter_id, reason)
    values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'harassment')$$);
select odtest.as_owner();

-- ===========================================================================
--  7. STORAGE
-- ===========================================================================
select odtest.as_user('22222222-2222-2222-2222-222222222222');

select odtest.denied('a member cannot write into another members folder',
  $$insert into storage.objects (bucket_id, name)
    values ('department-files',
            '44444444-4444-4444-4444-444444444444/smuggled.png')$$);

select odtest.allowed('a member CAN write into their own folder',
  $$insert into storage.objects (bucket_id, name)
    values ('department-files',
            '22222222-2222-2222-2222-222222222222/mine.png')$$);
select odtest.as_owner();

select odtest.as_user('33333333-3333-3333-3333-333333333333');
select odtest.denied('a banned member cannot write into storage at all',
  $$insert into storage.objects (bucket_id, name)
    values ('department-files',
            '33333333-3333-3333-3333-333333333333/after-ban.png')$$);
select odtest.as_owner();

-- ===========================================================================
--  8. THE DOOR -- handle_new_user()
--
--  Who may sign up is decided by a trigger on auth.users rather than by the
--  app, so that a hand-rolled call to the Supabase auth endpoint cannot get in
--  where the sign-up form would have refused. That claim is worth checking.
-- ===========================================================================
alter table auth.users enable trigger on_auth_user_created;

-- Nobody has founded this department yet: the fixture inserted its members
-- with the trigger held off, so `claimed` is still false and the founding
-- branch is still open. Close it the way the first real signup would.
update public.settings set claimed = true, open_join = false where id;

insert into public.invites (code, max_uses, grants_admin) values ('GOOD-CODE', 5, false);
insert into public.invites (code, grants_admin)             values ('ADMIN-CODE', true);
insert into public.invites (code, expires_at)               values ('STALE-CODE', now() - interval '1 day');
insert into public.invites (code, max_uses, uses)           values ('SPENT-CODE', 1, 1);

select odtest.denied('a closed department refuses a signup with no code',
  $$insert into auth.users (email) values ('nobody@example.test')$$);

select odtest.denied('a closed department refuses an unknown code',
  $$insert into auth.users (email, raw_user_meta_data)
    values ('nobody@example.test', '{"invite_code":"NOT-A-CODE"}'::jsonb)$$);

select odtest.denied('an expired code is refused',
  $$insert into auth.users (email, raw_user_meta_data)
    values ('nobody@example.test', '{"invite_code":"STALE-CODE"}'::jsonb)$$);

select odtest.denied('a used-up code is refused',
  $$insert into auth.users (email, raw_user_meta_data)
    values ('nobody@example.test', '{"invite_code":"SPENT-CODE"}'::jsonb)$$);

select odtest.allowed('a valid code is admitted',
  $$insert into auth.users (email, raw_user_meta_data)
    values ('welcome@example.test', '{"invite_code":"GOOD-CODE"}'::jsonb)$$);

select odtest.equals('a redeemed code counts the use',
  $$select uses::text from public.invites where code = 'GOOD-CODE'$$, '1');

select odtest.equals('an ordinary code does NOT confer administrator rights',
  $$select is_admin::text from public.profiles p
     join public.user_emails e on e.user_id = p.id
    where e.email = 'welcome@example.test'$$, 'false');

select odtest.allowed('an admin code is admitted',
  $$insert into auth.users (email, raw_user_meta_data)
    values ('deputy@example.test', '{"invite_code":"ADMIN-CODE"}'::jsonb)$$);

select odtest.equals('an admin code DOES confer administrator rights',
  $$select is_admin::text from public.profiles p
     join public.user_emails e on e.user_id = p.id
    where e.email = 'deputy@example.test'$$, 'true');

-- An open department admits anybody -- but a code is still the only thing that
-- can hand out administrator rights.
update public.settings set open_join = true where id;

select odtest.allowed('an open department admits a signup with no code',
  $$insert into auth.users (email) values ('walkin@example.test')$$);

select odtest.equals('walking in does NOT confer administrator rights',
  $$select is_admin::text from public.profiles p
     join public.user_emails e on e.user_id = p.id
    where e.email = 'walkin@example.test'$$, 'false');

-- ===========================================================================
--  9. ERASING THE DEPARTMENT
--
--  purge_department() deletes everything an archive contains in one call, so
--  it is the single most destructive thing anybody can reach through the anon
--  key. Three properties are worth failing a build over: who may call it, that
--  a caller who may still has to name the department first, and that what it
--  leaves behind is a shut door rather than an unclaimed department the next
--  stranger to find the address founds as its administrator.
--
--  This section runs LAST because it destroys the fixture every section above
--  builds on. It rebuilds the two rows it asserts against first, so that what
--  the sections above did or did not delete cannot change the answers.
-- ===========================================================================
select odtest.as_owner();

update public.settings set department_name = 'The Department' where id;

-- Two documents with paths the assertions below can look for. Erasing an
-- archive has to hand the storage paths back: once the rows are gone there is
-- nothing left that can name the objects they pointed at.
delete from public.files;
insert into public.files
  (owner_id, title, category, storage_path, original_name, mime_type,
   size_bytes, kind)
values
  ('22222222-2222-2222-2222-222222222222', 'Last exhibit standing', 'EXHIBIT',
   '22222222-2222-2222-2222-222222222222/last.png', 'last.png', 'image/png',
   4096, 'image'),
  ('11111111-1111-1111-1111-111111111111', 'The admin filed one too', 'EXHIBIT',
   '11111111-1111-1111-1111-111111111111/mine.png', 'mine.png', 'image/png',
   2048, 'image');

select odtest.as_anon();

-- The other admin RPCs let anon reach their is_admin() check and be turned
-- away by it. This one does not get that far: EXECUTE is granted to
-- `authenticated` alone.
select odtest.denied('a signed-out caller cannot even execute the erasure',
  $$select public.purge_department('The Department')$$);

select odtest.as_user('22222222-2222-2222-2222-222222222222');

select odtest.denied('an ordinary member cannot erase the department',
  $$select public.purge_department('The Department')$$);

-- The lever one administrator has over another has to reach this too, or
-- banning a rogue admin leaves them able to delete the archive on the way out.
select odtest.as_user('55555555-5555-5555-5555-555555555555');

select odtest.denied('a banned administrator cannot erase the department',
  $$select public.purge_department('The Department')$$);

select odtest.as_user('11111111-1111-1111-1111-111111111111');

select odtest.denied('an administrator naming the wrong department is refused',
  $$select public.purge_department('Some Other Department')$$);

select odtest.equals('and the refusal deleted nothing',
  $$select count(*)::text from public.files$$, '2');

-- The real thing. The reply is stashed in a GUC rather than discarded, because
-- half of what this function does is REPORT: a caller who is told nothing
-- cannot tell an erasure from a no-op, and cannot remove the objects either.
-- Trimming and case are the department's name as somebody actually types it.
select odtest.equals('an administrator erases the archive and is told what went',
  $$select set_config('odtest.purge',
       public.purge_department('  the department  ')::text, false)::jsonb ->> 'files'$$,
  '2');

select odtest.as_owner();

select odtest.equals('every document is gone',
  $$select count(*)::text from public.files$$, '0');

select odtest.equals('so is everything hanging off them',
  $$select (select count(*) from public.votes)::text
         || (select count(*) from public.comments)::text
         || (select count(*) from public.reports)::text
         || (select count(*) from public.file_subjects)::text$$, '0000');

select odtest.equals('the subjects and the invite codes are gone',
  $$select (select count(*) from public.subjects)::text
         || (select count(*) from public.invites)::text$$, '00');

select odtest.equals('every member but the caller is gone',
  $$select string_agg(id::text, ',') from public.profiles$$,
  '11111111-1111-1111-1111-111111111111');

select odtest.equals('and so are their accounts',
  $$select string_agg(id::text, ',') from auth.users$$,
  '11111111-1111-1111-1111-111111111111');

select odtest.equals('no e-mail address outlives the archive it was given to',
  $$select count(*)::text from public.user_emails$$, '1');

-- The one that turns an erased department into a hijacked one if it goes the
-- other way: an unclaimed department hands administrator rights to whoever
-- signs up next.
select odtest.equals('the door is shut behind it, not reopened',
  $$select claimed::text || open_join::text from public.settings where id$$,
  'truefalse');

select odtest.equals('the erasure itself is the only thing left in the log',
  $$select action from public.audit_log$$, 'department.purge');

select odtest.equals('and it is the only thing left in the log',
  $$select count(*)::text from public.audit_log$$, '1');

-- The bytes are the caller's to remove through the storage API. The paths are
-- the only way anything can still name them, so they have to come back --
-- including the caller's own, which the "keep the caller" rule must not spare.
select odtest.equals('every storage path came back so the objects can follow',
  $$select jsonb_array_length(current_setting('odtest.purge')::jsonb -> 'storage_paths')::text$$,
  '2');

select odtest.equals('including the ones the caller filed themselves',
  $$select (current_setting('odtest.purge')::jsonb -> 'storage_paths'
            ? '11111111-1111-1111-1111-111111111111/mine.png')::text$$, 'true');

-- ===========================================================================
--  RESULTS
-- ===========================================================================
\o
select * from odtest.report();

do $$
declare failed integer;
begin
  select count(*) into failed from odtest.results where not passed;
  if failed > 0 then
    raise exception '% RLS test(s) FAILED', failed;
  end if;
  raise notice 'all % RLS tests passed', (select count(*) from odtest.results);
end $$;
