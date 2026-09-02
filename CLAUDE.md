# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OpenDepartment is a multi-tenant Next.js app: anyone can spin up their own
parody-document-archive ("department"), backed by a Supabase project **they
own**. See [README.md](README.md) for the full product description and threat
model — read it before making changes to auth, the setup wizard, or anything
touching Supabase keys.

## Commands

```bash
npm run dev         # regenerates schema-sql.generated.ts, then next dev
npm run build        # regenerates schema-sql.generated.ts, then next build
npm run typecheck    # regenerates schema-sql.generated.ts, then tsc --noEmit
npm run build:schema  # just the codegen step (see below)
npm run test:rls      # the SQL security suite (see below)
```

No lint script is configured, and `next.config.ts` sets
`eslint.ignoreDuringBuilds`.

The only tests are SQL. `npm run test:rls` builds a throwaway PostgreSQL
cluster, applies a Supabase shim, applies both `db/*.sql` files **twice**
(re-running them is the documented upgrade path, so idempotency is a tested
property), and asserts the policies actually hold — 61 assertions against the
tenant schema, 34 against the control plane. It needs a `postgres` server
binary and nothing else: no Supabase project, no network, no credentials. See
[db/test/README.md](db/test/README.md) before adding a case; the two rules that
matter are that a test must run as `anon`/`authenticated` rather than the table
owner (the owner bypasses RLS), and that a blocked write has two distinct
shapes worth asserting separately. There is no single-test runner; the suites
are two `.sql` files.

**When you change a policy, a grant or a `security definer` function, add the
assertion in the same commit** — and check it goes red against the old schema,
or it is proving nothing.

## The two-database architecture (read this before touching auth/session code)

There are **two independent Supabase projects/roles** in play, and almost
every bug class in this repo comes from conflating them:

1. **Control plane** (`src/lib/control/*`) — OpenDepartment's own Supabase
   project. Holds only the slug → department directory
   (`departments` table) and operator accounts. Configured via
   `NEXT_PUBLIC_CONTROL_SUPABASE_URL` / `NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY`.
   Schema lives in [db/control-plane.sql](db/control-plane.sql).
2. **Tenant** (`src/lib/tenant/*`) — each department's *own* Supabase
   project, supplied by that department's owner at setup time (URL + anon
   key only, stored as a row in the control plane). Holds settings,
   profiles, files, votes, comments, invites, audit log. Schema lives in
   [db/tenant-schema.sql](db/tenant-schema.sql).

**Client-side validation of anything in `settings` is decoration.** The
administration screen checks that the accent is six hex digits and clamps the
upload cap, but `settings` is admin-writable over PostgREST, so a hand-rolled
call skips the form. Every such rule has to exist as a CHECK constraint or a
column privilege in [db/tenant-schema.sql](db/tenant-schema.sql) as well —
`accent` especially, because it is substituted into real CSS
(`background: var(--accent)`) and a value carrying a semicolon reparses into
extra declarations.

**OpenDepartment never holds a `service_role` key for any tenant.** Every
privileged tenant operation (member listing, file deletion, owner email
lookup, stats) is a `security definer` Postgres function inside the
tenant's own database that re-checks `is_admin()`/`is_active_member()`
itself — see the table in the README and the function definitions in
`db/tenant-schema.sql`. When adding a new admin capability, add a
`security definer` RPC to the schema rather than reaching for elevated
credentials from the app.

Consequences that show up throughout the code:

- **Two cookie realms.** The control-plane session uses the default
  Supabase cookie name. Each department gets its own cookie named
  `od-<slug>` scoped to path `/d/<slug>` (see
  [src/lib/tenant/cookies.ts](src/lib/tenant/cookies.ts)). Being signed
  into one grants nothing in the other, and membership in one department
  doesn't attach a token to requests for any other.
- **[src/middleware.ts](src/middleware.ts)** dispatches on path prefix:
  `/d/*` → `tenantMiddleware` (resolves the slug, creates a
  request-scoped Supabase client scoped to that department's cookie
  path, gates login); `/account/*` → `controlMiddleware` (gates the
  OpenDepartment account session). Never merge these two code paths.
- **Slug resolution** happens up to three times per request (middleware,
  layout, page), so it's memoized twice: `resolveDepartment`
  ([src/lib/control/departments.ts](src/lib/control/departments.ts)) uses
  React's `cache()` for per-request dedup; `resolveDepartmentCached`
  ([src/lib/control/cache.ts](src/lib/control/cache.ts)) is a process-local
  60s TTL map the middleware uses instead (it can't share React's
  per-request cache with the page). Both apply the **same precedence**:
  the control-plane directory is authoritative; `STATIC_DEPARTMENTS` (see
  below) only fills gaps and can never shadow a registered department. If
  you change resolution logic, change it in both places or extract it.
- **OAuth/magic-link callbacks must live at `/d/<slug>/auth/callback`**,
  not a shared top-level route, because the department's cookie is only
  writable from a path under `/d/<slug>`.

### Pinned departments (`STATIC_DEPARTMENTS`)

An env var (JSON: `{"slug": {"url", "key", "name"}}`) that lets a single
department resolve with **no control plane, no wizard, no account** —
used for local dev without burning a Supabase project, and as a
legitimate production deployment shape for someone who wants one archive
with no platform around it. Resolved by
[src/lib/control/dev.ts](src/lib/control/dev.ts) and consulted only
*after* the real directory lookup fails.

### Schema codegen — edit the `.sql`, never the `.ts`

[db/tenant-schema.sql](db/tenant-schema.sql) is the SQL the setup wizard
shows a new department owner to paste into their own project. Vercel only
ships traced files, so the raw `.sql` can't be read at request time in
production. `npm run predev`/`prebuild` run
[scripts/build-schema.mjs](scripts/build-schema.mjs), which bakes it into
[src/lib/tenant/schema-sql.generated.ts](src/lib/tenant/schema-sql.generated.ts)
(gitignored, generated). **Always edit `db/tenant-schema.sql` and rerun
`npm run build:schema`** — the generated file will be silently
overwritten otherwise.

## Route structure

- `src/app/d/[slug]/*` — everything inside one department (front door,
  `login`, `join` invite redemption, `auth/callback`, `onboarding`,
  `access-denied`, `vault`, `upload`, `file/[id]`, `admin`). Every page
  under here should start from `requireDepartment` /
  `requireMember` / `requireDeptAdmin` /
  `getMember` in [src/lib/tenant/auth.ts](src/lib/tenant/auth.ts) rather
  than querying Supabase directly for auth state.
- `src/app/(marketing pages)`, `src/app/new`, `src/app/directory`,
  `src/app/account/*` — the platform level (register a department, browse
  the public directory, manage an OpenDepartment account). Guarded by
  `controlMiddleware`, not tenant auth.
- `src/app/api/setup/probe` — server-side probe of a candidate Supabase
  project during onboarding. Pins the target to `*.supabase.co`/`.in`
  before fetching (SSRF guard) and rejects any `service_role`-shaped key
  (both legacy JWT and new `sb_secret_` prefix) before it's ever stored.
  Also requires a control-plane session and rate-limits per account and per
  address: the reply distinguishes "no schema" from "unreachable" from
  "already claimed", and an unclaimed project whose URL and anon key you hold
  is one signup away from being yours. Any change here needs to preserve all
  of it.
- `src/app/d/[slug]/legal/{terms,privacy,imprint}` — a department's own legal
  pages, rendered from its `operator_name` / `operator_contact` settings via
  `department_identity()`. Three real routes rather than one `[doc]` segment
  on purpose: the department layout is dynamic, so a `notFound()` in a page
  under it lands after the response starts streaming and renders a 404 page
  with a 200 status. They are also in `TENANT_PUBLIC` — an imprint only
  members can read is not an imprint.

## i18n

Custom, not a library: [src/lib/i18n/dictionary.ts](src/lib/i18n/dictionary.ts)
holds translations, [src/lib/i18n/provider.tsx](src/lib/i18n/provider.tsx)
exposes `useI18n()` (`t`, `plural`, `formatDate`), locale is detected
server-side ([src/lib/i18n/detect.ts](src/lib/i18n/detect.ts)) and
persisted in a cookie. Plural keys follow a `{base}_one` / `{base}_other`
convention consumed by `plural(base, n)`.

## Branding

Nothing about any specific department (name, seal text, accent color,
docket prefix, categories, upload cap) is hardcoded — it's all read at
request time from the tenant's own `settings` row via
[src/lib/tenant/branding.ts](src/lib/tenant/branding.ts). Don't add
copy or defaults that assume a particular department's content.
