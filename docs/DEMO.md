# Public demo department

**This needs a free Supabase project slot. Supabase allows two active free
projects per account; the live platform's control plane already uses one.
Levi must create the demo project himself. Nothing in the repo creates this
demo project as part of this guide.** These are manual operator instructions;
no infrastructure has been created by writing them.

Use a dedicated, disposable department. [The seed](../db/seed-demo.sql) is
marked development/testing only and says never to run it against a department
real people are using. Treat public visitors' contributions as disposable;
do not use this department for a real archive or personal documents.

## Create and open it

1. In the Supabase dashboard, create a new free project for the demo and wait
   for it to finish starting. Keep it separate from the platform control plane.
   Note its project reference, project URL and public anon key. Never supply a
   `service_role` or secret key to OpenDepartment.
2. Choose one setup route:

   **Wizard (usual route on the live platform).** Open
   <https://opendepartment.vercel.app/new>. Choose a name, available slug and
   docket prefix; enter the actual operator name and public contact. Choose
   **Public** visibility: the personalized SQL also sets
   `settings.open_join = true`. Use the manual setup path with the project you
   just created. Copy or download the wizard's **complete** personalized SQL
   and run it in that project's SQL editor; the shortened preview is not SQL
   you can run. Complete the e-mail step below, then paste the project URL and
   anon key, sign into or create the OpenDepartment operator account when
   prompted, and verify/register the department. This platform account manages
   the listing; it is separate from the department founder account.

   **Pinned alternative.** On a deployment Levi controls, install
   [db/tenant-schema.sql](../db/tenant-schema.sql) in the new project's SQL
   editor. Follow [Manual and pinned installations](AUDIT-BOOTSTRAP.md#manual-and-pinned-installations)
   to generate a private founder capability locally and install only its
   digest in SQL. Configure this deployment's `STATIC_DEPARTMENTS` environment
   variable, replacing the example coordinates and slug:

   ```text
   STATIC_DEPARTMENTS={"demo":{"url":"https://YOURREF.supabase.co","key":"YOUR_ANON_KEY","name":"Demo Department","visibility":"public"}}
   ```

   Apply the environment configuration to the deployment. This route needs no
   wizard, control plane or platform account. `visibility: "public"` includes
   the pin in that deployment's directory; it does **not** set the tenant's
   open door. After founder signup, enable **Anyone can join** as in step 6.
   Set the department name and operator fields in Administration → Settings.
   Use a distinct slug: directory registration takes precedence over a pin.
   A pin on a different deployment does not add a listing to the live platform.
3. Configure e-mail in the **demo project's** Supabase Authentication settings.
   Either turn off **Confirm email**, so strangers can sign up without a
   confirmation message, or configure working custom SMTP and keep confirmation
   enabled. The default mail service only delivers to the project's team and
   has tight rate limits; it is unsuitable for public signup. In Authentication
   → URL Configuration, allow this exact redirect URL for the live deployment:

   ```text
   https://opendepartment.vercel.app/d/<slug>/auth/callback
   ```

   Replace `<slug>` with the chosen slug, and use your own deployment origin
   for a pinned installation. Confirmation and password reset depend on this
   callback. Test delivery if keeping confirmation enabled.
4. Open the wizard's **private founder completion link**, or the private link
   generated for the pinned installation, and sign up with Levi's own account.
   Complete confirmation if enabled and confirm that Administration is
   accessible. Keep the setup tab/link private until signup succeeds; share
   only the ordinary `/d/<slug>` address afterward. A fresh schema alone does
   not allow the first signup. See [founder setup and recovery](AUDIT-BOOTSTRAP.md)
   if the capability is lost or the founder address is mistyped.
5. **Only after founder signup**, open the demo project's SQL editor and run
   all of [db/seed-demo.sql](../db/seed-demo.sql). It refuses to run unless the
   department is claimed and an active, unbanned administrator exists. Do not
   run it in the control plane. An incompatible Supabase Auth schema causes
   the seed transaction to fail rather than leave a partial seed; investigate
   the actual error before continuing.
6. As founder, open **Administration → Invites** and confirm **Anyone can join**
   is selected. Set it explicitly for a pinned installation. For a registered
   department, confirm the listing is **Public** under **Your departments**
   (`/account`), and verify it appears at `/directory`. For a pin, check its
   `visibility` configuration and that deployment's directory. The listing and
   `settings.open_join` are independent after setup. Public means discoverable
   and open to signup; visitors still need a member account to read the archive.
7. In **Administration → Settings**, save a low **Largest upload** value, for
   example **2 MB** (`max_upload_mb`, supported range 1–50), and **Storage per
   member**, for example **20 MB** (`max_member_storage_mb`, supported range
   1–100000; blank means unlimited). Saving the upload cap also updates the
   bucket limit. These are suggested demo limits, not protection against many
   accounts or unfiled storage objects. Verify the operator name/contact too.
8. Open `/d/<slug>/vault`, subjects and Administration → Reports. Check the
   seed content, then try ordinary signup without an invite in a separate
   browser session before sharing the ordinary department URL.

## Seed content and shared accounts

The seed creates five subjects, twelve exhibit rows, comments, mixed votes,
view counts and one open report marked safe to dismiss. It does **not** upload
the storage objects those exhibits reference. Downloads will not produce real
documents, and the two image exhibits can show broken images.

It creates three confirmed, ordinary members, not administrators:

| Username | Sign-in e-mail | Password |
| --- | --- | --- |
| `agent_k` | `agent.k@example.test` | `demopass123` |
| `agent_m` | `agent.m@example.test` | `demopass123` |
| `agent_q` | `agent.q@example.test` | `demopass123` |

On a public demo these credentials are public. Anyone can act as these members
if they remain enabled. Levi must decide whether to keep them available or
ban them through Administration → Personnel after seeding. Never grant them
administrator rights or reuse their password for the founder. Re-running the
seed preserves existing accounts/passwords and bans; it does not reset them
to fresh login credentials, though it restores their demo usernames.

## Hardening the public demo

Optionally run all of [db/demo-harden.sql](../db/demo-harden.sql) manually in
**the dedicated The Open Files demo project's SQL editor**, after the tenant
schema and demo seed. It runs in one transaction and is safe to repeat. It is
never part of the ordinary tenant schema or wizard SQL and affects only the
project where you apply it. **Re-run it after re-applying tenant-schema.sql for
an upgrade.**

The database enforces these limits (MB here means 1024 × 1024 bytes):

- Largest upload: **2 MB**, using the existing bucket limit; member storage
  setting: **20 MB**.
- All objects in `department-files`, including objects without file rows:
  **300 MB** department total, **20 MB** per member (owned by them or in their
  UUID folder), and **20 objects per member per rolling 24 hours**.
- Comments: **10 per author per 10 minutes**, **50 per author per day**, and
  **30 per hashed IP per hour**. Only SHA-256 address hashes are stored, pruned
  after a day when comments are submitted. Missing IP headers leave the author
  limits in effect.
- New accounts: **20 department-wide per hour**, **100 per day**, counted from
  profile creation. A rejected signup rolls back. GoTrue's database connection
  has no request headers; Supabase Auth's built-in IP rate limits supply the
  per-IP layer.
- The three shared demo accounts cannot upload objects or create file rows.
  They can still comment and vote within the limits. Their password, email,
  phone and pending email/phone changes are preserved on Auth updates, so
  visitors cannot change those shared credentials. Check the SQL editor for
  a notice if Auth table permissions prevent installing this guard; an Auth
  table owner must install it in that case.

Upload checks inspect existing objects before insertion; the incoming object's
size is unavailable then. The 2 MB bucket ceiling bounds overshoot per in-flight
upload, rather than reserving exact bytes across concurrent uploads. These are
small demo safeguards, not a substitute for monitoring or cleanup. Deleted
objects/comments/accounts no longer count toward their corresponding limits.

In the Supabase dashboard, open **Authentication → Rate Limits** and lower
sign-ups/sign-ins per IP. Keep **Confirm email** off for immediate demo signup,
or configure working custom SMTP if keeping confirmation on. Enable
**leaked-password protection** in the Authentication password settings where
available; verify the shared demo credentials still work before launch.

To undo, run all of [db/demo-harden-undo.sql](../db/demo-harden-undo.sql) in the
same SQL editor with the same privileges. It removes only the demo policies,
triggers, helper functions and private throttle/backup tables, restores the
settings caps saved on first application, and keeps all content and accounts.
Neither script deletes storage objects; use the Storage API or dashboard.

## What to watch for

### Abuse

An open door lets strangers upload illegal material or personal information.
Check **Administration → Reports** for per-file reports inside the department;
admins can delete the file or resolve/dismiss the report. The seed's example
report is separate from real complaints. Ban abusive members under
**Administration → Personnel**, and close new signup under Invites if needed.
Closing signup does not remove existing members or their content.

The platform's <https://opendepartment.vercel.app/report> path is a separate
department-level abuse channel for platform staff. Staff can suspend a
registered department so its slug stops resolving; suspension does not erase
the tenant's data or delete its Supabase project. A standalone pin has no
control-plane listing to suspend: its operator must manage its configuration
and tenant directly. Do not rely on suspension as a storage cleanup.

### Resets

Re-running the seed clears its own exhibit rows (the `demo-seed/` storage-path
markers) and subjects marked `demo seed`, with dependent engagement/report
rows, then recreates the demo content. It leaves other manually created
content alone. It does not clear strangers' uploads or reset the whole demo.

For a full demo content reset:

1. While signed in as the founder administrator, use Administration → Settings
   → **Erase this department**, then type the department name and confirm.
   This calls `purge_department(confirm)` as the signed-in administrator.
2. Read the result and handle any warnings. The RPC deletes archive rows and
   other memberships, attempts to delete other Auth accounts, and returns
   original/thumbnail paths for the UI to remove through the Storage API.
   If objects or Auth accounts remain, clean them up in the demo project's
   dashboard. Check Settings → Storage for unreferenced objects (shown once
   older than one hour), and the Supabase dashboard for actual usage.
3. Keep the project and listing for reuse. Erasure retains the caller's admin
   account and settings, keeps `claimed = true`, and sets `open_join = false`.
   It does not delete the project or listing. Do not reopen founder bootstrap.
4. Once cleanup is complete, run the seed again in the demo project's SQL
   editor. If an Auth-account cleanup warning left demo accounts without
   profiles, remove those leftover accounts first; the seed refuses accounts
   without member profiles.
5. Re-enable **Anyone can join**, verify public visibility, caps and operator
   details, and repeat the shared-account decision and signup check.

Suggested cadence: inspect daily while public and reset weekly or after a
demo session, sooner if abuse or storage requires it. Reset is manual; the
repo has no automatic reset mechanism or reset cron.

### Storage and availability

Plan around the Supabase free-plan limits: **1 GB file storage**, **50 MB
maximum file size**, **500 MB database**, **5 GB egress**, and a project paused
after **one week of inactivity**. Check actual usage in the Supabase dashboard;
the department's storage meter and per-member cap do not account for every
unreferenced object. Low per-file caps do not prevent aggregate exhaustion.
The demo's project URL and anon key are public by design; tenant RLS and
membership rules provide authorization, not secrecy of those values.

These figures were checked against Supabase's
[pricing](https://supabase.com/pricing),
[project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
and [file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
pages in October 2026. The storage and egress quotas apply to the whole free
organisation, not per project, so the demo shares them with anything else in
the same organisation. Re-check before launch and confirm a project slot is
free.

### Privacy and operator identity

Administrators can see members' e-mail addresses. Do not advertise anonymous
membership, publish member lists or give shared accounts admin privileges.
The department's `operator_name` and `operator_contact` fields appear in its
public imprint/legal pages and footer; use accurate operator details and a
contact suitable for public collection, such as a role address. These can be
edited in Administration → Settings. Tell visitors their demo contributions
can be erased during a manual reset.

## Launch checklist

- [ ] Levi has created a dedicated project using an available slot.
- [ ] Schema, e-mail settings and callback URL are configured.
- [ ] Private founder signup succeeded before seeding.
- [ ] Seed ran successfully; placeholder-file limitations are understood.
- [ ] Anyone can join is enabled and the listing is public.
- [ ] Low upload/member caps and public operator details are saved.
- [ ] Levi has decided whether shared demo accounts stay enabled.
- [ ] Ordinary signup works; Levi has checked both abuse-report channels.
- [ ] Levi has chosen a manual review/reset cadence and verified plan limits.
