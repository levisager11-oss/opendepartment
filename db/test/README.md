# Security tests

The whole authorisation model of OpenDepartment is SQL: row level security
policies, column privileges, and the `is_admin()` check inside each
`security definer` function. None of it is reachable from the TypeScript, so
none of it was covered by anything. This is where "a member cannot promote
themselves" stops being a comment in a `.sql` file and becomes something a
machine checks.

```bash
npm run test:rls
```

The default runner uses PGlite with its pgcrypto extension on Node 22, including
Windows. Run `npm ci` first. It creates separate disposable in-memory databases
for the tenant and control plane and does not access a Supabase project.

For native PostgreSQL, run `npm run test:rls:native`. This requires Bash and
PostgreSQL 14+ server binaries. Set `PGBIN` if the binaries are not on the path
(on Debian/Ubuntu they live in `/usr/lib/postgresql/<version>/bin`). It creates
and removes only its own temporary cluster.

## What is in here

| file | |
|---|---|
| `00-shim.sql` | Stand-ins for what Supabase provides — the `auth` and `storage` schemas, `auth.uid()`, and the `anon` / `authenticated` roles. **Never run this against a real project.** |
| `01-helpers.sql` | Assertion helpers and role impersonation. |
| `02-rls-tests.sql` | The tenant schema: 98 assertions. |
| `03-control-plane-tests.sql` | The control plane: 46 assertions. |
| `04-tenant-security-regressions.sql` | Anonymous deletion, protected columns, reports, founder proof and orphan cleanup regressions. |
| `05-control-security-regressions.sql` | Operator cascade and registration serialization regressions. |
| `run.mjs` | Portable PGlite runner. |
| `run.sh` | Native cluster runner. |

Applying each schema twice is deliberate. Re-running the `.sql` files is the
documented way a deployment picks up a change, so "is it still idempotent" is
a property worth failing the build over rather than discovering in somebody's
SQL editor. The runner prints current assertion totals rather than relying on
the historical counts above.

The shim validates PostgreSQL authorization behavior, not Supabase's hosted
Auth or Storage services. Single-backend PGlite does not reproduce concurrent
transactions. Exercise those integrations separately before production rollout.

## Two things worth knowing before adding a test

**Run as `anon` or `authenticated`, never as the owner.** The table owner
bypasses row level security unless the table is `force`d, so a suite that ran
as `postgres` would pass no matter what the policies said. `odtest.as_user()`
and `odtest.as_anon()` exist for this.

**A blocked write has two different shapes**, and the helpers distinguish them
because they are fixed in different places:

- `odtest.denied(...)` — the statement *raises*. A missing INSERT policy, a
  revoked column privilege, a CHECK constraint, or a `raise exception` inside a
  `security definer` function.
- `odtest.touches_nothing(...)` — the statement *succeeds and changes nothing*.
  This is what a blocked UPDATE or DELETE looks like under RLS: the rows are
  simply not visible to it, so PostgREST reports success. It is also why
  several places in the app select the row back after an update — without that,
  a refused write and a successful one look identical from the browser.

## Does a test that passes prove anything?

Only if it can fail. Every assertion added here was checked against the schema
*before* the fix it covers: the tenant suite reports 12 failures when run
against the pre-hardening `db/tenant-schema.sql`. A new test is worth the same
sanity check — `git stash` the schema change, watch it go red, unstash.
