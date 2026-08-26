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
npm run lint         # eslint, flat config in eslint.config.mjs
npm run build:schema  # just the codegen step (see below)
```

`npm run typecheck && npm run lint` is the whole check suite. There is no test
suite, and therefore no single-test-file runner.

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
  `access-denied`, `vault`, `upload`, `file/[id]`, `admin`,
  `legal/[doc]`). Every page
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
  Any change here needs to preserve both checks.

## i18n

Custom, not a library: [src/lib/i18n/dictionary.ts](src/lib/i18n/dictionary.ts)
holds translations, [src/lib/i18n/provider.tsx](src/lib/i18n/provider.tsx)
exposes `useI18n()` (`t`, `plural`, `formatDate`), locale is detected
server-side ([src/lib/i18n/detect.ts](src/lib/i18n/detect.ts)) and
persisted in a cookie. Plural keys follow a `{base}_one` / `{base}_other`
convention consumed by `plural(base, n)`.

## Branding

Nothing about any specific department (name, seal text, accent color,
docket prefix, categories, upload cap, operator) is hardcoded — it's all
read at request time from the tenant's own `settings` row via
[src/lib/tenant/branding.ts](src/lib/tenant/branding.ts). Don't add
copy or defaults that assume a particular department's content.

The same rule covers the department's own legal pages
([src/lib/tenant/legal.ts](src/lib/tenant/legal.ts), rendered at
`/d/<slug>/legal/[doc]`): the text is generated from the tenant's
`department_name`, `subject_label`, `operator_name` and `operator_contact`.
Those last two are published deliberately — they are the answer to "who is
answerable for this archive", which is the whole reason the field exists —
so `department_identity()` returns them and the page is reachable signed
out. Don't gate it behind `requireMember`: the person who needs it most is
the one who was written about, and they are not a member.
