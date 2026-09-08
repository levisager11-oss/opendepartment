# OpenDepartment

Run your own parody document archive. A generalisation of
[The Lorenzo Files](https://the-lorenzo-files.vercel.app/): anyone can create a
department, name it after anything, invite their own people, and keep every
byte of it in a Supabase project they own.

The [September 2026 audit](AUDIT.md) records the current security fixes,
verification, remaining limitations and rollout steps. New installations use
a private founder link; existing deployments must apply the updated SQL in
both the control plane and every tenant project.

---

## The shape of it

Live at **https://opendepartment.vercel.app**

There are **two databases**, and keeping them apart is the whole design.

```
                    ┌──────────────────────────────────────┐
   opendepartment   │  CONTROL PLANE  (our Supabase)       │
   .vercel.app      │                                      │
        │           │  departments:  slug → url + anon key │
        ├──────────▶│  operators:    who registered what   │
        │           │  abuse_reports                       │
        │           │                                      │
        │           │  NO files. NO members. NO content.   │
        │           └──────────────────────────────────────┘
        │
        │  /d/the-lorenzo-files
        │           ┌──────────────────────────────────────┐
        └──────────▶│  TENANT  (the owner's own Supabase)  │
                    │                                      │
                    │  settings, profiles, files, votes,   │
                    │  comments, reports, invites, audit   │
                    │  storage bucket: department-files    │
                    └──────────────────────────────────────┘
```

A request to `/d/<slug>` resolves the slug against the control plane, gets back
a Supabase URL and an anon key, and talks to that project for everything else.

### Why this answers "I'm not infinitely rich"

The control plane stores roughly 200 bytes per department. Ten thousand
departments is a few megabytes and zero storage egress, because uploads go
**browser → the owner's Supabase Storage** and never pass through our server.
Vercel's free tier and one free Supabase project cover the whole platform; each
department's own free tier covers its members.

### Why we never take a service_role key

The original single-tenant app used the service role key in four places
(admin listings, file deletion, owner e-mail lookup, landing stats). Holding
one of those per department would mean holding master keys to thousands of
strangers' databases — one breach, total compromise, everywhere.

So every privileged operation moved into a `security definer` function inside
the tenant's own database, each re-checking `is_admin()` itself:

| Was | Is now |
| --- | --- |
| `admin.from("user_emails").select()` | `admin_list_members()` |
| `admin.from("files").delete()` | `delete_file(id, reason)` |
| `admin.from("user_emails")` for one file | `admin_file_owner_email(id)` |
| `admin` counts for the landing page | `department_stats()` |
| `admin` deleting a department's tables | `purge_department(confirm)` |

What OpenDepartment holds **at rest** is a URL and an anon key — both public by
design and restricted by the tenant's own RLS. During a member's request, the
server receives that member's session, reads authorized metadata and creates
temporary signed file URLs. This architecture avoids a permanent tenant
administrator key; it does not make the hosting server unable to read data
that the current visitor is authorized to access.

One caveat, and it is a real one. If the deployment enables the optional
[one-click setup](#one-click-setup-optional), OpenDepartment **does** handle a
Supabase Management API token belonging to the person setting up — for the
minutes it takes to create their project and install the schema. That token is
never written to any database; it lives encrypted in an httpOnly cookie in
their own browser and is deleted when provisioning finishes. But the server
decrypts it on each request, which it must in order to use it. So the accurate
claim is *not written to a database, short-lived, account-bound and scoped to
setup*. A deployment that does not want that property simply leaves the two
environment variables unset, and the feature does not exist.

The setup endpoint decodes the pasted key and **refuses a `service_role` JWT**
outright rather than trusting the instruction not to paste one.

### Row level security is row level

RLS answers "which rows", never "which columns", and Supabase hands the
`authenticated` role UPDATE on every column of every table in `public`. So
"you may edit your own profile row" also meant *you may set `is_admin` on it*,
and "you may edit your own file row" meant *you may set your own score to
9999*. The same shape in the control plane let an operator flip their own
department's `status` back from `suspended`, rename its slug past the reserved
list, or INSERT a row straight into the directory and skip
`register_department` along with its per-account cap.

Column privileges are the half of the grant system that *is* column-level, so
both schemas now revoke the blanket UPDATE and hand back only the columns that
are genuinely the caller's: `username` on a profile, title/description/category
on a file, name/tagline/visibility/project-coordinates on a directory row.
Every privileged path still works, because every one of them is a
`security definer` function running as the owner. The control plane also splits
its single `for all` policy into select/update/delete, with no INSERT policy at
all and DELETE refused on a suspended row -- delisting and re-registering was a
way back out of a suspension.

### Session isolation

Each department gets its own auth cookie, named `od-<slug>` and scoped to path
`/d/<slug>`. Two consequences worth knowing:

- Being a member of twenty archives does not put twenty tokens on every request.
- The OAuth/e-mail callback must live at `/d/<slug>/auth/callback`, because the
  cookie has to be writable from a path the browser will send it back to.

The control-plane session uses the default cookie name and is entirely separate:
an OpenDepartment account manages *listings*, and grants nothing inside any
department.

---

## Setting up the platform

1. Create a Supabase project for the control plane.
2. Run [`db/control-plane.sql`](db/control-plane.sql) in its SQL editor.
3. Copy `.env.example` to `.env.local` and fill in the two
   `NEXT_PUBLIC_CONTROL_*` values.
4. `npm install && npm run dev`

The live deployment's control plane is the Supabase project
`OpenDepartment-Test` (`flqyqpxqfkjvsrzvngbg`). It holds nothing but the
directory — one row per department, and no department content ever.

**Registering a department costs a Supabase project**, and the free tier allows
two per owner. Whoever runs the platform therefore cannot host their own
department on it without a third slot; everyone else brings their own account
and is unaffected.

`db/tenant-schema.sql` is **not** run by you — it is the SQL the wizard hands to
each department owner. It is baked into the bundle by
`scripts/build-schema.mjs` (wired to `predev`/`prebuild`), so edit the `.sql`
file and never the generated `.ts`.

## Running without a control plane

Supabase gives you **two free projects per owner**, so spending one on the
directory just to try the app is a bad trade. A department can instead be
pinned by configuration:

```bash
STATIC_DEPARTMENTS={"test":{"url":"https://YOURREF.supabase.co","key":"YOUR_ANON_KEY","name":"The Test Files"}}
```

`/d/test` then resolves with no control plane, no wizard and no account.

This works in production too, which makes it the deployment shape for anyone
who wants **one archive online and no platform around it**. The value comes
from the deployment's own environment, never from user input, and it is only
consulted *after* the directory — so a pin can never shadow a department
somebody registered through the wizard.

To fill a department with something to look at, run `db/seed-demo.sql`: five
subjects, twelve exhibits, comments, mixed votes, one open report, and three
demo members (password `demopass123`) so scores are not all from one person.

## One-click setup (optional)

A department owner's real work is four steps in the Supabase dashboard: create
a project, paste a schema, turn off e-mail confirmation, allow a callback URL.
Three of those are steps people skip and then file a bug about.

Register an OAuth app on Supabase and set `SUPABASE_OAUTH_CLIENT_ID` /
`SUPABASE_OAUTH_CLIENT_SECRET`, and the wizard offers to do all four itself.
The redirect URL to register is `https://YOUR-DEPLOYMENT/api/setup/oauth/callback`.

```
/api/setup/oauth/start      PKCE + state, both sealed; requires an account
/api/setup/oauth/callback   exchanges the code, seals the token into a cookie
/api/setup/oauth/status     what this deployment offers, and whether you are connected
/api/setup/provision        create project → wait for health → run schema →
                            read the anon key → configure auth → forget the token
/api/setup/deprovision      delete the project behind a department you own →
                            forget the token
```

**Scopes to grant the OAuth app**, and nothing else — one per call the code
actually makes. Read and write are separate boxes in the dashboard, so a
resource needed for both appears twice:

| Scope | Access | Why |
| --- | --- | --- |
| Organizations | Read | `GET /v1/organizations`, to know where to put the project |
| Projects | Write | `POST /v1/projects` to create it, `DELETE /v1/projects/{ref}` to delete it again |
| Projects | Read | `GET /v1/projects/{ref}/health`, to wait for it to come up |
| Database | Write | `POST /v1/projects/{ref}/database/query`, to install the schema |
| Secrets | Read | `GET /v1/projects/{ref}/api-keys`, to read the anon key back |
| Auth | Write | `PATCH /v1/projects/{ref}/config/auth`, the e-mail and callback step |

Everything else stays at **No access**. The consent screen shows this list to
every department owner, so a scope granted here and never used is a permission
they are asked for and a reason not to click the button.

Two things about scopes that are easy to get wrong, because neither is visible
from the code that asks for them:

- **The authorize request does not name them.** Supabase's `scope` query
  parameter is deprecated; an OAuth app's scopes are fixed when the app is
  published, and the authorize endpoint reads them from there. `/oauth/start`
  therefore sends no `scope` at all. Sending one that is not a member of the
  granular vocabulary — `scope=all`, as an older revision of this code did, and
  as Supabase's own integration sample still shows — narrows the grant to
  nothing rather than widening it: the code exchanges cleanly, and every call
  made with the resulting token comes back 403.
- **Changing them later does not reach anybody who already authorised.** An
  existing authorisation keeps the scopes it was granted; the operator has to
  connect again for a new set to apply. If you add a missing scope, press
  **Connect Supabase** once more rather than only pressing **Create my
  project**.

`Secrets` is the counter-intuitive one: the api-keys endpoint is filed under
that tag, so reading the anon key is `Secrets → Read` rather than anything
named after keys or projects.

Each row above is the endpoint's own `x-oauth-scope`, read from
https://api.supabase.com/api/v1-json — the OpenAPI description carries the
required scope per operation, so this table can be re-derived rather than
inferred from tag names:

```
GET   /v1/organizations                  organizations:read
POST  /v1/projects                       projects:write
DELETE /v1/projects/{ref}                projects:write
GET   /v1/projects/{ref}/health          projects:read
POST  /v1/projects/{ref}/database/query  database:write
GET   /v1/projects/{ref}/api-keys        secrets:read
PATCH /v1/projects/{ref}/config/auth     auth:write
```

What it deliberately does **not** do:

- **It does not register the department.** That still happens from the browser
  under the operator's own control-plane session, through
  `register_department()` and its per-account cap, exactly as the manual path
  does. The endpoint hands back a URL and an anon key; it does not decide who
  they belong to.
- **It does not keep the token.** Cleared on every exit except
  `STILL_STARTING`, which is the one outcome a caller can continue from — and
  a continuation sends back the project ref, so a retry can never leave a
  second project on somebody's account.
- **It does not keep the database password.** One is generated for project
  creation and discarded. OpenDepartment never connects to a tenant's database
  directly — everything goes through PostgREST with the anon key — so keeping
  one would be keeping a credential for no reason.

**When it does not work, it says so.** Every exit from the round trip names
itself: the callback sends the wizard a reason (`declined`, `state`, `expired`,
`session`, `exchange`, `unavailable`) plus whatever Supabase said, and
`/oauth/status` distinguishes "no token" from a token Supabase issued and then
would not accept — the one failure that otherwise resembles success. A refusal
is split by status, because 401 and 403 need opposite responses: **401** is an
access token that has aged out (Supabase issues them for an hour, and this
wizard is a form somebody can sit on for longer), fixed by connecting again and
not by touching scopes; **403** is a token Supabase will not allow to make that
particular call, where a missing scope is the usual cause. Every refusal
carries the operation, the status and Supabase's own words to the screen rather
than a guess about which of the two it was. Provisioning reports
the same way: a 401/403 while waiting for the new project's health is reported
as a refusal against the project it already made, rather than polled out to the
timeout and reported as "still starting".

Leave both variables unset and none of this exists: the wizard does not offer
it and every route above answers 503. **The manual path is unchanged either
way**, and remains the only path on a deployment without an OAuth app.

## What an owner does

1. Names the department, picks an address and a docket prefix.
2. Creates a free Supabase project.
3. Pastes the wizard's SQL — already personalised with their name — into the
   SQL editor.
4. **Configures e-mail.** A new Supabase project only delivers mail to
   addresses on its own team and rate-limits to a handful an hour, so if
   confirmation is on and SMTP is not configured, no invited member ever gets
   in. The wizard makes this a step rather than a footnote: either switch off
   "Confirm email" (right answer for a class — people join with invite codes
   instead) or connect your own SMTP.
5. Pastes back the project URL and anon key -- or just the key. The connect
   step takes a paste of anything with those values in it (the two on their
   own, a `.env` block, the whole "Project API keys" card with its headings
   still attached) and pulls them out; a legacy anon key names its own project
   in its payload, so pasting it alone fills in the URL too. We probe the
   project, confirm the schema is installed and unclaimed, then register the
   slug.

The wizard also asks, in step 1, who runs the department. That answer is what
the department's own imprint, terms and privacy pages say, and the wizard used
to leave it null -- so every department created through it published three
legal pages that could not name anybody. Both fields are optional and editable
later under Administration.

Progress is kept in `sessionStorage` for the length of the sitting. The connect
step needs an OpenDepartment account, creating one can send you to your inbox
and back, and coming back to an empty form *after* running the SQL against a
real project was the worst moment in the flow: the project is claimed by then,
so starting over does not work either.

**Only the holder of the wizard's private founder link can create the first
administrator.** The browser generates a single-use secret and puts only its
SHA-256 digest in the SQL. Keep the founder link until signup succeeds. See
[founder setup and recovery](docs/AUDIT-BOOTSTRAP.md), including the extra step
for a fresh pinned department installed without the wizard.

### Getting in

A department has one of two doors, chosen by its administrator under
Administration → Invites and stored as `settings.open_join` in the
department's own database:

- **Invite code required** (the default, and how every new department
  starts). There is deliberately no e-mail allowlist: maintaining one means
  collecting and typing in thirty addresses before anyone can join, when a
  code pasted into a group chat does the same job in one message. Admins
  create codes with an optional usage cap and expiry, and hand out
  `/d/<slug>/join?code=XYZ`.
- **Anyone can join.** A department that is public has no code to knock with
  — the archive is listed in the directory, so demanding a code to read it
  would be theatre. The setup wizard sets this for you when you pick
  "Public"; either half can be changed afterwards, the listing under Your
  departments and the door inside the department.

Either way the decision is enforced by the `handle_new_user()` trigger on
`auth.users` inside the tenant's project, not by the sign-up form, so a
hand-rolled API call gets exactly as far as the UI would let it.

A code still counts in a public department: it can be marked as granting
administrator rights, which is the one thing an open door cannot do. The UI
warns about that in red, because redeeming one means seeing every member's
e-mail address.

### Deleting one

Three things carry a department, they live in three different places, and no
one screen can reach all three. The delete flow says so out loud rather than
letting one word imply the rest:

| | Where | Who | How |
| --- | --- | --- | --- |
| The archive's contents | the owner's Supabase project | any administrator of the department | Administration → Settings → *Erase this department* |
| The listing (`/d/<slug>`) | OpenDepartment's control plane | whoever registered it | Your departments → *Delete* |
| The project itself | Supabase | whoever owns the Supabase account | Your departments → *Delete*, with **Delete the Supabase project as well** ticked — or the Supabase dashboard |

`purge_department(confirm)` is the first row: a `security definer` function in
the department's own database that re-checks `is_admin()`, insists the caller
type the department's name, and then deletes every file, vote, comment, report,
subject, invite, log line and member account in one transaction. Like
`delete_file()` it hands the storage paths back rather than touching
`storage.objects`, so the objects go through the storage API under the
administrator's own session — deleting those rows would drop the metadata and
leave the bytes where they are. Two things it deliberately does not do: it does
not delete the caller (an administrator who erased themselves mid-way could not
finish, or even see that it worked), and it does not reset `claimed` — an empty
department that is *unclaimed* is one the next stranger to find the address
founds as its administrator, which is worse than the problem being solved.

The third row is the one that actually makes the data stop existing, and it is
the step people skip. When the deployment has an OAuth app and the owner
authorises it, `/api/setup/deprovision` deletes the project for them — the ref
comes from the department row RLS has already established is theirs, never from
the request body, because a Management API token is authorised for a whole
organisation. **When it cannot, it says so with the project ref and a link to
the dashboard**, and keeps saying so after the listing is gone: a "deleted"
department whose documents are still sitting in a project somebody has stopped
thinking about is the failure worth designing against. The same notice is what
a deployment with no OAuth app shows every time, since there is nothing else it
could honestly offer.

Delisting alone remains available — leave the box unticked — and is still
irreversible in the one way that surprises people: the slug is freed for
somebody else, and the project cannot be registered again because it is already
claimed.

---

## Abuse controls at launch

- **3 departments per account**, enforced inside `register_department` rather
  than in the UI. Without a cap one script reserves every good slug overnight.
  There is no INSERT policy on `departments`, so the function is the only door
  in and the cap is not something a hand-rolled API call can step around.
- **30 reserved slugs**, covering app routes and names worth impersonating.
- **Unlisted by default.** A department appears in `/directory` only if its
  owner opts in.
- **Terms accepted at signup**, with the responsibility spelled out rather
  than buried: the person who creates an archive answers for what is in it.
- **Suspension** — setting a department's `status` to `suspended` stops its
  slug resolving, without touching a byte of the owner's own data. `status` is
  not in the operator's UPDATE grant and a suspended row cannot be deleted, so
  a suspension is not something its subject can lift or delist their way out
  of.

## Status

Everything below is built and was exercised against a real Supabase project
(department UI signed into, admin actions performed, audit rows verified, and
the create-a-department flow run end to end on the live deployment).

- Control-plane and tenant schemas, RLS, and the admin RPC surface
- Slug resolution, per-request memoisation, process-local middleware cache
- Per-department cookie isolation, dual-realm middleware
- Branding read from the tenant: name, seal text, accent, docket prefix,
  categories, upload cap. Nothing about any particular subject is in the code
- Marketing landing, `/directory`, `/legal/terms`, `/legal/privacy`,
  `/account`, `/account/login`
- Five-step setup wizard: SSRF-pinned probing, service-key rejection, SQL
  personalisation, and the e-mail step. The connect step takes a paste of
  anything with a project URL or key in it, the draft survives a reload, and
  the operator's own name and contact are collected so a new department's
  imprint is not blank
- Optional one-click setup over a Supabase OAuth app (see above). Written
  against the Management API reference; **not yet exercised against a live
  Supabase OAuth app**, because that needs credentials this repository does
  not have. Inert until those are set
- Department: front door, `login`, `join` (invite redemption),
  `auth/callback`, `onboarding`, `access-denied`, `vault`, `upload`,
  `file/[id]`, `admin`
- Invite management: generate a code, cap its uses, expire it, copy the join
  link, revoke it. Redemption verified end to end — a missing code, a wrong
  code and a valid code each produce the right outcome
- A settings screen under Administration: name, tagline, the noun the files
  are about, docket prefix, seal text, accent, categories, upload cap and the
  operator's own name and contact. An ordinary admin-gated UPDATE on the
  tenant's `settings` row, with the row selected back so a policy refusal
  reads as an error rather than as a form that changed nothing
- Password reset end to end. The link lands on `auth/callback`, which
  forwards to `auth/update-password` — without that screen a reset link
  signed somebody in and left the old password in place, which is a magic
  link wearing the wrong label
- Pinned departments (`STATIC_DEPARTMENTS`) and `db/seed-demo.sql`
- Ko-fi button on the platform pages only, never inside a department

- Per-department legal pages (`/d/<slug>/legal/{terms,privacy,imprint}`),
  rendered from the department's own `operator_name` / `operator_contact`.
  Readable without an account, because an imprint only members can read is not
  an imprint. The footer had linked to these three addresses since before they
  existed
- Renaming a department in the **directory**. "Refresh name" on `/account`
  reads the current name and tagline out of the department's own project and
  writes them to its directory entry, under the operator's own RLS. It is the
  operator's action rather than something the department posts, because
  nothing in the control plane can verify a name handed to it — an endpoint
  that accepted one would let anybody rewrite anybody's entry
- The storage bucket's `file_size_limit` follows `settings.max_upload_mb`: a
  trigger resizes the bucket when the cap changes, so the settings screen can
  offer the whole range instead of stopping at a number frozen in the schema
- **A nonce-based CSP.** The policy is built per request in the middleware
  rather than declared in `next.config.ts`, because a header declared there is
  one fixed string and a fixed string cannot carry a nonce — which is why
  `script-src` used to say `'unsafe-inline'`, the one directive an XSS
  actually cares about. It now carries a per-request nonce and
  `'strict-dynamic'`, so nothing runs unless it carries that nonce or was
  loaded by something that did. Verified in a browser: an injected
  `<script>` in the served HTML is refused, and every page still hydrates
  with no violations. `style-src` keeps `'unsafe-inline'` and says why — the
  accent reaches the page as a style *attribute*, which no nonce can cover,
  and that value is fenced by a CHECK constraint instead
- **A SQL security suite** (`npm run test:rls`) for both schemas and a Vitest
  suite for session isolation, setup, navigation and UI failure/retry behavior.
  CI runs both suites, TypeScript and a production build.

Not built yet:

- Rate limiting that survives more than one serverless instance. The limiter
  on the setup probe is in-memory and therefore per-instance

## Testing the part that actually enforces things

Tenant authorization is enforced by SQL policies, column privileges and
checked functions. The test runner exercises those controls as `anon` and
`authenticated`, alongside application regression tests.

```bash
npm ci
npm run typecheck
npm test
npm run build
```

`npm run test:unit` runs Vitest. `npm run test:rls` uses disposable in-memory
PostgreSQL instances through PGlite, with local stand-ins for Supabase Auth and
Storage. It works on Windows and Linux with Node 22 and needs no project or
credentials. Both schemas are applied twice before their tests run. The suite
checks founder authorization, member/admin boundaries, column privileges,
banned accounts, suspension, report validity, quota accounting and cleanup.

`npm run test:rls:native` runs the SQL suites against a temporary native
PostgreSQL cluster instead; it requires Bash and PostgreSQL binaries. Neither
local runner exercises hosted Auth, Storage byte transfers, OAuth or
multi-session locking. Those need a disposable Supabase integration project.

For local production HTTP checks, start an unconfigured build with
`npm run start -- --hostname 127.0.0.1`, then run `npm run test:smoke` in another
terminal. This checks public pages, CSP/nonces, 404 responses and cross-origin
setup refusal; it only accepts a loopback target.

Applying each schema twice is the point of a separate step: re-running these
files is the documented upgrade path below, so idempotency fails the suite
rather than somebody's SQL editor.

Security regressions were exercised against the original schemas before the
fixes and then rerun against the corrected schemas.
[db/test/README.md](db/test/README.md) has the rest.

## Upgrading a deployment that already exists

Both `.sql` files are idempotent and re-running them is the supported way to
pick up a change. The privilege fixes described under *Row level security is
row level* live in those files, so:

- **The platform operator** re-runs [`db/control-plane.sql`](db/control-plane.sql)
  in the control-plane project once.
- **Every department owner** re-runs [`db/tenant-schema.sql`](db/tenant-schema.sql)
  in their own project. Until they do, their members can still promote
  themselves. The wizard hands out the current file, so departments created
  from here on are fine.

**This round's tenant fix is the urgent one.** `is_admin()` read the
`is_admin` column and nothing else, so banning an administrator took away the
interface and left every power intact: `requireMember()` sends them to
`/access-denied`, but the department's anon key is printed on its own front
door and their session is still valid, so `admin_list_members()` (every
member's e-mail address), `delete_file()` and `admin_set_flag()` all remained
one HTTP call away. A banned administrator could read the whole membership,
delete other people's documents, and ban whoever had just banned them. Banning
is the only lever one administrator has over another that does not need the
other to cooperate, so it has to be the one that lands. Until a department
re-runs the file, the right order there is **demote first, then ban**.

The control-plane fix is smaller but the same shape. Refusing a `service_role`
key lived only in `/api/setup/probe`, and the probe is not the only door into
that column: `register_department()` is granted to `authenticated` and callable
straight over PostgREST, and `anon_key` is in the operator's own UPDATE grant,
so a department registered with a proper key could be repointed at a secret one
afterwards with the probe never running. OpenDepartment would then print a
master key to that project in the page source of its front door. There is now a
CHECK constraint on the column, catching both key generations. It is added
`NOT VALID`; to audit the rows already in a directory:

```sql
alter table public.departments validate constraint departments_key_not_secret;
```

This earlier round added **per-member document-size accounting**
(`settings.max_member_storage_mb`, null for none), an **orphan sweep** on the
administration screen for objects whose document row is gone, **one view per
person per hour** instead of one per reload, and a fence tying
`files.storage_path` to the folder its owner may actually write to.
The accounting limit does not enforce actual Storage usage or billing: direct
uploads and caller-supplied sizes bypass it. Monitor the project's usage.

The current round of fixes also adds, to the tenant schema: `is_active_member()`
on `claim_username()`, a shape constraint on invite codes (a code may carry
`grants_admin`, so a guessable one is not a weak password but an
unauthenticated route to every member's e-mail address), a `for update` on the
settings read in `handle_new_user()` so two signups in the same instant cannot
both found the department, a column fence on
`settings` (an administrator could set `claimed` back to false, which makes the
next signup found the department again — no invite code, instant
administrator), CHECK constraints on `accent`, `max_upload_mb` and
`categories`, a membership check on `increment_view()` (it was `security
definer` with no check and PUBLIC execute, so the anon key printed on every
front door could drive unbounded writes), a constraint tying `mime_type` to
`kind`, and `is_active_member()` on the vote and file-update policies. The
constraints on existing rows are added `NOT VALID`, so re-running the file does
not ask anybody to delete documents their members filed under the old rules.

The historical fixes above do not require the app to be redeployed first.
For the current founder-verification change, follow the coordinated rollout
in [AUDIT.md](AUDIT.md) and [founder setup](docs/AUDIT-BOOTSTRAP.md).
The app also refuses a non-hex `accent` on the way out, so a department that
has not re-run the file yet still cannot have CSS injected through it.

## Notes for whoever runs this

Each department names its own operator in its settings and its footer says so.
That is deliberate: the person who creates an archive about their classmates is
the one responsible for it, and the interface should not let them forget it.
`/report` is the platform-level takedown path, linked from the marketing
footer and from every department's own footer with the slug prefilled. It is
distinct from the per-file report inside a department, which goes to that
department's own administrator — the wrong address when the administrator is
the problem.

It takes no account, on purpose: the person who needs it is a stranger who has
just been shown something about themselves, and asking them to register with
the platform they are complaining about is asking them not to bother. What
stands in for an account is `report_department()`, a `security definer`
function that is now the only way into `abuse_reports` — the table used to
carry an open `with check (true)` insert policy for `anon`, which bounded how
big each row could be and not at all how many there could be. The function
requires the slug to name a department that actually resolves, collapses a
repeat from the same address, and stops one archive's queue growing past
twenty-five open reports, which is well past the point where it still tells
whoever reads it anything. Whether a report was filed, deduplicated or dropped
against that cap is not distinguishable from outside. Setting a department's
`status` to `suspended` stops its slug resolving without touching a single row
of their data — which stays entirely theirs, in their own project.
