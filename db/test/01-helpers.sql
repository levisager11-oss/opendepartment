-- ===========================================================================
--  Assertion helpers for the RLS suite.
--
--  Every test runs as `anon` or `authenticated` on purpose. The table owner
--  bypasses row level security unless the table is FORCE'd, so a suite that
--  ran as postgres would pass no matter what the policies said.
-- ===========================================================================
create schema if not exists odtest;

create table if not exists odtest.results (
  n        serial primary key,
  name     text not null,
  passed   boolean not null,
  detail   text
);

-- Become a signed-in member. Supabase puts the verified JWT in this GUC and
-- auth.uid() reads it; impersonating one is therefore just setting it.
--
-- Session-level, not `set local`. The suite deliberately does not wrap its
-- sections in transactions: a rollback would take the recorded results down
-- with the statements under test, and the run would report only whatever
-- happened after the last one. Sections call odtest.as_owner() to hand the
-- session back instead.
create or replace function odtest.as_user(who uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
                     json_build_object('sub', who::text, 'role', 'authenticated')::text,
                     false);
  execute 'set role authenticated';
end; $$;

create or replace function odtest.as_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
  execute 'set role anon';
end; $$;

/** Back to the role that owns the schema, for fixtures and bookkeeping. */
create or replace function odtest.as_owner()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
  execute 'reset role';
end; $$;

create or replace function odtest.record(name text, passed boolean, detail text default null)
returns void language sql as $$
  insert into odtest.results (name, passed, detail) values (name, passed, detail);
$$;

/**
 * Assert that a statement is REFUSED outright -- a policy with no INSERT
 * clause, a column privilege that was revoked, or a CHECK constraint. Any of
 * those raise; which one is not the point, that the write does not land is.
 */
create or replace function odtest.denied(name text, stmt text)
returns void language plpgsql as $$
begin
  execute stmt;
  perform odtest.record(name, false, 'statement was ALLOWED but should have been refused');
exception
  when insufficient_privilege or check_violation or raise_exception
    or unique_violation or foreign_key_violation then
    perform odtest.record(name, true, sqlstate);
end; $$;

/**
 * Assert that a statement is allowed to run but SILENTLY MATCHES NOTHING.
 *
 * This is the shape a blocked UPDATE or DELETE takes under row level security:
 * the rows simply are not visible to it, so it reports success having changed
 * nothing. Distinguishing this from odtest.denied above matters -- the two
 * failures look identical from the app and are fixed in different places.
 */
create or replace function odtest.touches_nothing(name text, stmt text)
returns void language plpgsql as $$
declare touched integer;
begin
  execute stmt;
  get diagnostics touched = row_count;
  perform odtest.record(name, touched = 0,
    case when touched = 0 then null else format('changed %s row(s)', touched) end);
exception
  when insufficient_privilege or check_violation then
    -- Refused even harder than required. Still the property under test.
    perform odtest.record(name, true, sqlstate || ' (refused outright)');
end; $$;

/** Assert a statement succeeds -- the fences must not have over-fenced. */
create or replace function odtest.allowed(name text, stmt text)
returns void language plpgsql as $$
begin
  execute stmt;
  perform odtest.record(name, true);
exception when others then
  perform odtest.record(name, false, sqlstate || ': ' || sqlerrm);
end; $$;

/** Assert a scalar query returns the expected value. */
create or replace function odtest.equals(name text, query text, expected text)
returns void language plpgsql as $$
declare got text;
begin
  execute query into got;
  perform odtest.record(name, got is not distinct from expected,
    case when got is not distinct from expected then null
         else format('expected %L, got %L', expected, got) end);
exception when others then
  perform odtest.record(name, false, sqlstate || ': ' || sqlerrm);
end; $$;

create or replace function odtest.report()
returns table (outcome text, name text, detail text)
language sql as $$
  select case when passed then 'pass' else 'FAIL' end, r.name, r.detail
    from odtest.results r order by r.n;
$$;

-- The helpers run AS the impersonated role -- deliberately not `security
-- definer`, which would run the statement under test as the owner and bypass
-- every policy the suite is trying to check. So the roles need real access to
-- the bookkeeping.
grant usage on schema odtest to anon, authenticated;
grant select, insert on odtest.results to anon, authenticated;
grant usage, select on sequence odtest.results_n_seq to anon, authenticated;
grant execute on all functions in schema odtest to anon, authenticated;
