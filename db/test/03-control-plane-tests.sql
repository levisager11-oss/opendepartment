-- ===========================================================================
--  OPENDEPARTMENT -- control plane suite
--
--  Smaller than the tenant suite because the control plane holds less: a slug,
--  a project URL, a public anon key and a name. What it does hold is the two
--  things the platform cannot let an operator decide for themselves --
--  SUSPENSION and the per-account CAP -- so those are what this checks.
--
--  Runs against its own scratch database; see db/test/run.sh.
-- ===========================================================================
\set ON_ERROR_STOP on
\o /dev/null
truncate odtest.results;

delete from auth.users;

insert into auth.users (id, email) values
  ('aaaa1111-0000-0000-0000-000000000001', 'operator@example.test'),
  ('bbbb2222-0000-0000-0000-000000000002', 'stranger@example.test');

-- ===========================================================================
--  1. REGISTERING
-- ===========================================================================
select odtest.as_user('aaaa1111-0000-0000-0000-000000000001');

select odtest.allowed('an operator can register a department',
  $$select public.register_department('first-dept',
      'https://aaaaaaaaaaaa.supabase.co', 'anon-key-1', 'First Department')$$);

select odtest.denied('the same slug cannot be registered twice',
  $$select public.register_department('first-dept',
      'https://bbbbbbbbbbbb.supabase.co', 'anon-key-2', 'Impostor')$$);

select odtest.denied('a reserved slug cannot be registered',
  $$select public.register_department('admin',
      'https://cccccccccccc.supabase.co', 'anon-key-3', 'Reserved')$$);

select odtest.denied('a slug that is not a slug is refused',
  $$select public.register_department('Not A Slug!',
      'https://dddddddddddd.supabase.co', 'anon-key-4', 'Bad')$$);

select odtest.denied('a non-Supabase project URL is refused',
  $$select public.register_department('evil-dept',
      'https://evil.example.com', 'anon-key-5', 'Elsewhere')$$);

-- The cap is three. One is registered, so two more land and the fourth does not.
select odtest.allowed('second department',
  $$select public.register_department('second-dept',
      'https://eeeeeeeeeeee.supabase.co', 'k', 'Second')$$);
select odtest.allowed('third department',
  $$select public.register_department('third-dept',
      'https://ffffffffffff.supabase.co', 'k', 'Third')$$);
select odtest.denied('the per-account cap is enforced in the database',
  $$select public.register_department('fourth-dept',
      'https://gggggggggggg.supabase.co', 'k', 'Fourth')$$);

-- There is no INSERT policy on departments: the function is the only door, so
-- writing the row directly is how someone would step around the cap.
select odtest.denied('a department row cannot be inserted directly',
  $$insert into public.departments
      (slug, operator_id, supabase_url, anon_key, display_name)
    values ('sneaky-dept', auth.uid(), 'https://hhhhhhhhhhhh.supabase.co',
            'k', 'Sneaky')$$);

-- ===========================================================================
--  2. WHAT AN OPERATOR MAY CHANGE ABOUT THEIR OWN ROW
-- ===========================================================================
select odtest.allowed('an operator can rename and relist their department',
  $$update public.departments
       set display_name = 'Renamed', tagline = 'A tagline', visibility = 'public'
     where slug = 'first-dept'$$);

select odtest.allowed('an operator can repoint their department at a new project',
  $$update public.departments set supabase_url = 'https://iiiiiiiiiiii.supabase.co'
     where slug = 'first-dept'$$);

select odtest.denied('an operator cannot repoint it off Supabase',
  $$update public.departments set supabase_url = 'https://evil.example.com'
     where slug = 'first-dept'$$);

select odtest.denied('an operator cannot lift their own suspension',
  $$update public.departments set status = 'active' where slug = 'first-dept'$$);

select odtest.denied('an operator cannot rename their slug past the reserved list',
  $$update public.departments set slug = 'admin' where slug = 'first-dept'$$);

-- ===========================================================================
--  3. SUSPENSION IS NOT SOMETHING ITS SUBJECT CAN WALK OUT OF
-- ===========================================================================
select odtest.as_owner();
update public.departments set status = 'suspended' where slug = 'second-dept';

select odtest.as_user('aaaa1111-0000-0000-0000-000000000001');

select odtest.touches_nothing('a suspended department cannot be delisted',
  $$delete from public.departments where slug = 'second-dept'$$);

select odtest.allowed('an unsuspended department CAN be delisted',
  $$delete from public.departments where slug = 'third-dept'$$);

select odtest.equals('a suspended department stops resolving',
  $$select count(*)::text from public.resolve_department('second-dept')$$, '0');

select odtest.equals('a suspended department leaves the public directory',
  $$select count(*)::text from public.public_directory(60)
     where slug = 'second-dept'$$, '0');

select odtest.equals('an active public department is in the directory',
  $$select count(*)::text from public.public_directory(60)
     where slug = 'first-dept'$$, '1');

-- ===========================================================================
--  4. ONE OPERATOR IS NOT ANOTHER
-- ===========================================================================
select odtest.as_user('bbbb2222-0000-0000-0000-000000000002');

select odtest.equals('an operator sees none of somebody elses departments',
  $$select count(*)::text from public.departments$$, '0');

select odtest.touches_nothing('an operator cannot rename somebody elses department',
  $$update public.departments set display_name = 'Hijacked'
     where slug = 'first-dept'$$);

select odtest.touches_nothing('an operator cannot delist somebody elses department',
  $$delete from public.departments where slug = 'first-dept'$$);

select odtest.equals('an operator sees only their own operator row',
  $$select count(*)::text from public.operators$$, '1');

-- ===========================================================================
--  5. A SIGNED-OUT VISITOR
-- ===========================================================================
select odtest.as_anon();

select odtest.equals('anon cannot read the directory table',
  $$select count(*)::text from public.departments$$, '0');

select odtest.equals('anon cannot read the reserved slug list',
  $$select count(*)::text from public.reserved_slugs$$, '0');

select odtest.equals('anon cannot read operator accounts',
  $$select count(*)::text from public.operators$$, '0');

select odtest.denied('anon cannot register a department',
  $$select public.register_department('anon-dept',
      'https://jjjjjjjjjjjj.supabase.co', 'k', 'Anon')$$);

-- resolve_department is the one read every department page load performs for a
-- signed-out visitor, so it has to answer -- and it has to answer with only the
-- coordinates, never the operator behind them.
select odtest.allowed('anon CAN resolve a slug',
  $$select * from public.resolve_department('first-dept')$$);

select odtest.allowed('anon CAN read the public directory',
  $$select * from public.public_directory(60)$$);

select odtest.allowed('anon CAN check whether a slug is free',
  $$select public.slug_available('something-new')$$);

select odtest.equals('a reserved slug reads as unavailable',
  $$select public.slug_available('admin')::text$$, 'false');

-- Filing an abuse report needs no account; reading them back is nobody's.
select odtest.allowed('anon CAN file an abuse report',
  $$insert into public.abuse_reports (slug, reason)
    values ('first-dept', 'impersonation')$$);

select odtest.denied('an abuse report cannot be unbounded',
  $$insert into public.abuse_reports (slug, reason, details)
    values ('first-dept', 'spam', repeat('x', 5000))$$);

select odtest.equals('nobody can read abuse reports back',
  $$select count(*)::text from public.abuse_reports$$, '0');

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
    raise exception '% control-plane test(s) FAILED', failed;
  end if;
  raise notice 'all % control-plane tests passed',
    (select count(*) from odtest.results);
end $$;
