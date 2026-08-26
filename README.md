# OpenDepartment

Run your own parody document archive. A generalisation of
[The Lorenzo Files](https://the-lorenzo-files.vercel.app/): anyone can create a
department, name it after anything, invite their own people, and keep every
byte of it in a Supabase project they own.

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

What OpenDepartment holds is a URL and an anon key — both public by design and
useless without an account the tenant's own RLS admits. **We cannot read any
department's contents**, which is a feature, not a limitation: it is also the
honest answer when someone asks who can see their files.

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

The same shape had one more corner. `cast_vote()` and `claim_username()` check
`is_active_member()`, but a function is not what a hand-rolled request meets:
`insert into votes` with the department's own anon key skips the function
entirely, and the counter trigger is `security definer`, so a **suspended**
member could go on moving scores, renaming themselves and retitling their
files. The WITH CHECK halves of `votes`, `files` and `file_subjects` now carry
`is_active_member()` too, and `claim_username()` checks it before anything
else. The USING halves stay on identity alone -- a suspension should not also
hide someone's own rows from them.

`increment_view()` was the reverse case: `security definer`, no check inside
it, and EXECUTE granted to PUBLIC the moment it was created. A department's
anon key is printed into every page it serves -- that is the design -- so
anyone who opened a front door could drive any document's view count wherever
they liked without ever holding an account. It now checks membership in the
statement itself and is revoked from `anon`, and the four trigger bodies are
revoked from the API roles the way the control plane already revoked its own.

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
5. Pastes back the project URL and anon key. We probe the project, confirm the
   schema is installed and unclaimed, then register the slug.

**The first account to sign up becomes the administrator.** There is no seed
file to edit and no support ticket to file.

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
  personalisation, and the e-mail step
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
- Per-department legal pages at `/d/<slug>/legal/{terms,privacy,imprint}`,
  generated from the tenant's own `department_name`, `subject_label`,
  `operator_name` and `operator_contact`. Reachable **signed out**, on
  purpose: the person who most needs to know who runs an archive is the one
  who was written about in it, and they are not a member. The footer names
  the operator on every page for the same reason, and links to the imprint
  when nobody has been named
- Bringing a renamed department's name back to the **directory**. Renaming
  under Administration writes to the tenant, and the directory is a different
  database, so the listing used to keep advertising the old name. Your
  departments now reads what each project actually calls itself and offers to
  copy it across — an ordinary update on your own row, no new privilege

Not built yet:

- Keeping the storage bucket's `file_size_limit` in step with
  `settings.max_upload_mb`. The bucket is fixed at 25 MB, so the settings
  screen caps the field there rather than offering a number storage would
  refuse

## Upgrading a deployment that already exists

Both `.sql` files are idempotent and re-running them is the supported way to
pick up a change. The privilege fixes described under *Row level security is
row level* live in those files, so:

- **The platform operator** re-runs [`db/control-plane.sql`](db/control-plane.sql)
  in the control-plane project once.
- **Every department owner** re-runs [`db/tenant-schema.sql`](db/tenant-schema.sql)
  in their own project. Until they do, their members can still promote
  themselves, a suspended member can still vote, anyone at all can inflate a
  view count, and the department's own legal pages will not know who its
  operator is -- `department_identity()` only started returning
  `operator_name` / `operator_contact` in this revision. The wizard hands out
  the current file, so departments created from here on are fine.

## Notes for whoever runs this

Each department names its own operator in its settings and its footer says so.
That is deliberate: the person who creates an archive about their classmates is
the one responsible for it, and the interface should not let them forget it.
There is currently no platform-level "report this department" link — it was
removed deliberately. The `abuse_reports` table and its insert policy still
exist in the control plane if you want to reinstate one later, and the per-file
report feature inside each department is unaffected. Setting a department's
`status` to `suspended` stops its slug resolving without touching a single row
of their data — which stays entirely theirs, in their own project.
