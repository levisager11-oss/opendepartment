# OpenDepartment

Run your own private archive, dressed up as a records office: name a department,
invite your people, and keep its data in a Supabase project its owner owns,
in the cloud or on your own server. It is invite-only by default, and a
generalisation of [The Lorenzo Files](https://the-lorenzo-files.vercel.app/).
Live at **https://opendepartment.vercel.app**.

<!-- TODO(Levi): add a screenshot or GIF of a department here, e.g. docs/screenshot.png -->
> Screenshot coming soon.

## Try the demo

A public demo department is planned. See [the demo notes](docs/DEMO.md).

<!-- TODO(Levi): link the public demo department once it exists, see docs/DEMO.md -->

## Create your department in 5 minutes

1. Open [the setup wizard](https://opendepartment.vercel.app/new). Pick a name,
   address and docket prefix. Optionally add your operator name and contact
   address for the department's legal pages; you can edit them later.
2. Create a free Supabase project and wait for it to finish provisioning.
3. Copy the wizard's personalised SQL into that project's SQL editor and run it.
4. Configure e-mail: turn off **Confirm email** for a small private group, or
   set up your own SMTP for confirmations and password resets. Supabase's
   default mail only reaches your project's team and is heavily rate-limited;
   turning confirmation off does not make password-reset mail work. Under
   Authentication → URL Configuration, allow the callback URL the wizard shows:
   `https://opendepartment.vercel.app/d/<slug>/auth/callback`.
5. Connect by pasting the project URL and anon / publishable key. **Never paste
   the service_role key.** A `.env` block or the API keys card works too; a
   legacy anon key can supply its own URL. Sign in to or create an
   OpenDepartment account to register the listing. The wizard checks that the
   schema is installed and the project is unclaimed.
6. Sign up using the **private founder link** to create your administrator
   account. Keep it private until signup succeeds. Then create invite codes
   under Administration → Invites and share the invite links. If you chose
   Public, anyone can sign up; you can require codes again later.

If your deployment offers optional one-click setup, it can create the project,
install the schema and configure auth for you. The manual path stays available.
See [setup and recovery details](docs/SELF-HOSTING.md#what-an-owner-does).

## Self-host

**Whole platform, with a control plane.** Run `npm install`, copy
[.env.example](.env.example) to `.env.local`, and set the control-plane URL and
anon key. Run [db/control-plane.sql](db/control-plane.sql) in that project's
SQL editor, configure its auth callback, then run `npm run dev`.
[Platform setup](docs/SELF-HOSTING.md#setting-up-the-platform) has the details.

**One pinned department, without a control plane.** Run `npm install`, copy
`.env.example` to `.env.local`, and configure `STATIC_DEPARTMENTS` with your
project URL, anon key and department name. Install the tenant schema and follow
founder setup; `npm run dev` serves the pinned address without a wizard or
OpenDepartment account. See [pinned departments](docs/SELF-HOSTING.md#running-without-a-control-plane).

**Fully self-hosted Supabase.** Run Supabase on your own server, install the
tenant schema and configure auth, then pin its HTTPS origin with
`STATIC_DEPARTMENTS` in your copy of the app (`npm install`, `.env.example`,
`npm run dev`). Backups, upgrades and storage limits are yours.
See [running on your own server](docs/SELF-HOSTING.md#running-on-your-own-server).

## Features

- Vault with search, filters and infinite scroll; a subjects register.
- Multi-file upload with clipboard paste and progress; image thumbnails.
- Previous/next exhibit navigation and printing as a case file.
- Comments, votes and per-file reports to the department's administrators.
- Invite codes with usage caps and expiry, revocation, and optional open join.
- Administration screens for members, invites, settings and reports; audit log
  export, storage meter, orphan sweep and schema upgrade notices.
- Department branding and legal pages naming its own operator.
- Dark theme and English/German translations.
- Directory of public departments and platform takedown reports at `/report`.
- Optional one-click Supabase setup when the deployment enables it.
- Department deletion, with separate handling for contents, listing and project.

There is a Ko-fi button on platform pages, never inside a department.
The [full status and limitations](docs/SELF-HOSTING.md#status) include what has
been exercised and what remains unverified.

## FAQ and limits

**What fits on Supabase's free plan?** As of October 2026: 1 GB file storage,
500 MB database, 5 GB egress, a global maximum file size of 50 MB, and two
active free projects per account. Free projects are paused after one week of
inactivity; restore them from the dashboard. A few requests a day keeps a
project awake. See [pricing](https://supabase.com/pricing),
[free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
and [file limits](https://supabase.com/docs/guides/storage/uploads/file-limits).

**Does OpenDepartment see my files?** At rest it holds the project's URL and
anon key, public values restricted by the tenant's RLS. During a member's
request, the server receives their session, reads authorized metadata and
creates temporary signed file URLs. The hosting server can read data that the
current visitor is authorized to access. Optional one-click setup also handles
a short-lived Management API token; see the [security model](docs/ARCHITECTURE.md).

**Why no service_role key?** It would be a permanent master key to your
project. Privileged operations instead run checked functions in your own
database. The setup flow refuses service keys.

**Is “unlisted” secret?** No. It means not indexed and not in the directory;
slugs can still be discovered. Membership and database policies protect the
contents, not the obscurity of the address.

**What happens when I delete a department?** There are three places to clear:
contents in the tenant project (Administration → Settings → Erase this
department), its listing (Your departments → Delete), and the Supabase project
itself. With OAuth enabled and your authorization, the delete flow can delete
the project; otherwise it gives you its ref and a dashboard link. Delisting
alone frees the slug but leaves the project claimed and unable to register
again. See [the deletion details](docs/SELF-HOSTING.md#deleting-one).

**How many departments can I register?** Three per OpenDepartment account,
enforced in the database. Each needs its own Supabase project; the control
plane also takes a project if you run a whole platform.

**What about self-hosted storage limits?** Your storage service's
`FILE_SIZE_LIMIT` caps uploads before the bucket's limit is reached. The
bucket limit follows the department's configured upload cap.

## Security model

There are two databases: the control plane holds the directory and operator
accounts; each department's project holds its members, documents and storage.
OpenDepartment stores only the tenant URL and anon key as project credentials.
Privileged administrator operations use `security definer` functions in the
tenant database that re-check `is_admin()`; member operations check membership.
Column grants complement row level security. Per-department cookies keep each
department's session separate from other departments and the control plane.

Read the [full architecture and security model](docs/ARCHITECTURE.md), the
[September 2026 audit](AUDIT.md) for fixes, verification, remaining limitations
and rollout steps, and the [SQL testing guide](docs/SELF-HOSTING.md#testing-the-part-that-actually-enforces-things).
Existing deployments must apply updated SQL in both the control plane and every
tenant project; see [upgrading](docs/SELF-HOSTING.md#upgrading-a-deployment-that-already-exists).

## Contributing / Feedback

Use [GitHub issues](https://github.com/levisager11-oss/opendepartment/issues/new/choose)
for bugs, feature requests and setup problems. For questions and feedback, use
[GitHub Discussions](https://github.com/levisager11-oss/opendepartment/discussions).
Never paste keys in issues. Abuse reports go to
[the platform report form](https://opendepartment.vercel.app/report), not issues.

Read [CLAUDE.md](CLAUDE.md) for the architecture rules. Run the checks with:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

There is no lint script. The [testing guide](docs/SELF-HOSTING.md#testing-the-part-that-actually-enforces-things)
explains the local SQL suites and their limits.

## License

GNU AGPL-3.0. Copyright (C) 2026 Levi Sager. See [LICENSE](LICENSE).
If you run a modified version as a network service, you must offer its source
to the users of that service.

## Hosted version waitlist

A hosted version that needs no Supabase project of your own is being considered.
Join the waitlist on the [landing page](https://opendepartment.vercel.app/#waitlist).
