# Architecture and security model

This architecture and security model moved from the README.

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
| nothing — a member could not leave at all | `leave_department(confirm)` |

What OpenDepartment holds **at rest** is a URL and an anon key — both public by
design and restricted by the tenant's own RLS. During a member's request, the
server receives that member's session, reads authorized metadata and creates
temporary signed file URLs. This architecture avoids a permanent tenant
administrator key; it does not make the hosting server unable to read data
that the current visitor is authorized to access.

One caveat, and it is a real one. If the deployment enables the optional
[one-click setup](SELF-HOSTING.md#one-click-setup-optional), OpenDepartment **does** handle a
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

