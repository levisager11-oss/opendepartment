# Private founder setup

New departments require a private founder link to create their first administrator. A public project URL and anon key do not grant this right. The setup wizard generates a 256-bit random capability in the browser, installs only its SHA-256 digest in the tenant database, and puts the capability in the completion link's URL fragment. The platform server does not receive the capability.

Open the completion link yourself. The signup page removes the fragment from the address bar immediately and retains the capability in this tab's session storage so a reload can recover it. Signup sends it directly to your tenant's Supabase Auth service as `bootstrap_secret` metadata. Under the settings row lock, the signup trigger verifies the digest, consumes the verifier, creates the administrator and removes the raw capability from stored Auth metadata. Subsequent members follow the department's ordinary open-membership or invite rules.

Keep the setup tab and founder link private until signup succeeds. Share the ordinary `/d/<slug>` address afterward. The completion page's **Create another department** action creates a different key and keeps any pending handoff for the preceding department in this tab. A completed setup can be reopened in the same tab after signing back into the control account that registered it. Browser session storage is not a backup: clearing site data or closing the session can lose a pending key.

## Manual and pinned installations

The wizard's manual SQL option already includes the digest installation. Copy and run its current personalized SQL, finish the wizard, and use its private completion link.

For an installation that bypasses the wizard, including a pinned department configured in environment variables:

1. Install the current `db/tenant-schema.sql` using your project's privileged SQL editor. A fresh unclaimed schema deliberately rejects every signup until a founder verifier is installed.
2. Generate a capability on your own computer. For example, save the following as a local `bootstrap.mjs`, edit the public deployment origin and slug, and run `node bootstrap.mjs`. Its first output block is safe to paste into your project's SQL editor. Keep the second output, the private link, to yourself; do not paste it into SQL or a platform configuration field.

```js
import { randomBytes, createHash } from "node:crypto";

const origin = "https://your-opendepartment.example";
const slug = "your-department";
const secret = randomBytes(32).toString("hex");
const digest = createHash("sha256").update(secret, "utf8").digest("hex");

console.log(`begin;
select id from public.settings where id for update;
insert into public.department_bootstrap (id, secret_hash)
select true, '${digest}'
where exists (select 1 from public.settings where id and not claimed)
on conflict (id) do update set secret_hash = excluded.secret_hash;
commit;`);
console.log(`PRIVATE FOUNDER LINK: ${origin}/d/${encodeURIComponent(slug)}/join#bootstrap=${secret}`);
```

3. Run only the SQL block in the tenant project's SQL editor. Configure the department's public URL/anon key mapping and Supabase Auth callback settings as described in the main README. Open the private link in your browser and create your administrator account.
4. Remove local copies of the consumed link. The digest is single-use, but terminal output, browser extensions, screenshots and copied links can expose a pending capability before it is consumed.

Neither the raw capability nor a service-role key belongs in the platform registry, environment variables, a query string, an issue or source control. Do not put the capability directly in SQL; SQL history should contain only its digest. `department_bootstrap` has no anon/authenticated grants or RLS policies, so changing a verifier requires the project owner's privileged SQL access.

## Recovery and existing departments

If an unfinished saved draft has lost its key, the wizard sends you back to the SQL step with a recovery notice. Copy and rerun that SQL before continuing: it installs a new digest, invalidating any earlier unused founder link. If the whole draft is gone, the manual procedure above can issue a replacement link for the existing unclaimed department without changing its registry entry.

### The department was claimed by an address nobody controls

This is the case the reissue SQL above cannot reach, and it is reachable by an
ordinary typo. When e-mail confirmation is enabled, Supabase Auth inserts the
row into `auth.users` **before** the address is confirmed, so `handle_new_user`
runs immediately: the verifier is consumed, `settings.claimed` becomes true and
an administrator profile is created, all attached to an account whose owner
never receives the confirmation mail. The department is claimed, the founder
link is spent, and the personalization SQL refuses to install a new verifier
because it is guarded on `not claimed`.

Nothing in the app can recover this, by design — there is no service_role key
anywhere in it. Recover it from the project's own SQL editor, and read the
`select` first: it should list exactly the account you mistyped, and nothing
else.

```sql
-- 1. Look at what is actually there before deleting anything.
select u.id, u.email, u.email_confirmed_at, p.is_admin, p.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
 order by u.created_at;

-- 2. Remove the unconfirmed founder. Replace the address with the one from the
--    listing above; this is deliberately not written as "delete every
--    unconfirmed account", because on a department that has been running for a
--    while that is not the same set.
begin;
delete from auth.users where email = 'the-address-you-mistyped@example.test';

-- 3. Reopen founding only if the deletion left nobody who can administer the
--    department. The guard is the point: on a department that already has a
--    working administrator this updates no rows, and you should stop here.
update public.settings set claimed = false
 where id and not exists (
   select 1 from public.profiles p where p.is_admin and not p.is_banned
 );
commit;
```

Then issue a fresh founder link with the `bootstrap.mjs` procedure above — the
personalization SQL will now install a verifier, because `claimed` is false
again — and sign up with the address spelled correctly. Turning e-mail
confirmation off for the founding signup avoids the whole situation, which is
what the setup wizard's e-mail step recommends.

Reapplying the current schema to an already claimed department preserves its administrator and membership behavior. The personalization and manual SQL above install a verifier only while `settings.claimed` is false. They do not reopen a claimed department or replace its administrator. A department claimed by the wrong person before this protection was installed requires a separate owner-led account/role recovery; installing this schema does not silently take it back.

The regression suite checks fragment clearing, reload/reset recovery, hash-only personalized SQL, rejected founder signups, single-use verification, Auth metadata cleanup, ordinary membership after claiming and denial of direct verifier access. Local SQL tests run in isolated PostgreSQL instances with a Supabase role shim; they do not exercise Supabase's hosted mail delivery, external OAuth consent or a deployed browser/network flow. Test one fresh department on the target deployment before broadly rolling out a schema upgrade.
