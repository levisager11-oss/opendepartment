# Codebase audit — 8 September 2026

This audit covers OpenDepartment's repository, security boundaries, user flows,
database policies, setup and recovery behavior. The baseline was commit
`ebe4fabb10b4ab8eb5dcc6eed4ede372f76a0c80`. Fixes and new tests are in the working
tree; no deployment, production database, commit or push was performed.

## Security findings and remediation

Eleven source-backed findings were validated: three high, six medium and two
low. Ten have code fixes. The storage quota bypass remains open. These are
baseline findings; the listed remediation describes the current working tree.

| Severity | Finding | Current result |
| --- | --- | --- |
| High | Anonymous `delete_file` calls passed a SQL NULL authorization condition when a file ID was known. | Requires an active member, uses NULL-safe ownership comparison, and revokes anonymous/PUBLIC execution. Banned-owner direct deletion is also fenced. |
| High | Supabase's browser singleton reused the first project's client across department/control-plane navigation. | Explicitly disables the library singleton and caches clients within the correct realm and project coordinates. Tests use the actual installed factory. |
| High | A stranger could win the first-signup race after an unclaimed department was publicly listed. | A 256-bit founder capability is generated in the browser. SQL verifies a private digest and consumes it under the settings lock. Public coordinates cannot authorize founding. |
| Medium | Deleting an operator row cascaded through suspended departments, bypassing their deletion policy. | Removes operator INSERT/DELETE access and restricts profile updates to the intended column. |
| Medium | Direct Storage uploads and false `files.size_bytes` values bypassed member quotas. | **Open.** Settings now describe document accounting accurately; it is not a byte-storage or billing limit. See the storage hardening proposal. |
| Medium | File INSERT privileges allowed callers to supply protected scores, counters, case numbers and timestamps. | INSERT grants are limited to the upload fields; protected values come from database defaults/triggers. |
| Medium | Slash/backslash login redirects could navigate to an external origin after authentication. | Shared normalized local-path validation rejects backslashes, control characters and foreign origins; tenant callbacks also stay inside their department. |
| Medium | Targetless reports bypassed deduplication and flooded the moderation queue. | Exactly one target is required; comment reports are deduplicated too; callers cannot choose moderation status/timestamps. Open reports are loaded independently of closed history. |
| Medium | Concurrent registrations could exceed the three-department account limit. | Locks the operator row before counting and inserting. Source and sequential checks pass; a native concurrent transaction test is still needed. |
| Low | Direct profile UPDATE bypassed username validation and banned-member restrictions. | Adds a username constraint and requires active membership on self-update. |
| Low | A surviving setup OAuth token could be used after switching control accounts in the same browser profile. | Token envelopes now bind purpose, account ID and absolute expiry; all consumers enforce them. This finding requires the shared-browser condition; no remote token-stealing path was established. |

The scan reviewed 137 of the original 140 tracked paths. The lockfile's
third-party package internals and two static font binaries were explicitly
excluded from source review. Supporting Supabase/Next client implementation
was inspected where necessary to validate the isolation and redirect findings.
Supplemental review covered all 40 React components and the added code/tests.
The [canonical security report](docs/security-scan/report.md) retains exact
baseline evidence and threat-model assumptions separately from this remediation
summary. Its sealed manifest, findings and coverage are saved alongside it.

## User experience fixes and added features

- Vault filters now survive reloads and can be shared through the URL. A clear
  action resets them, browser navigation restores them, stale queries/votes
  cannot replace newer results, and failed pagination retries the same page.
- Uploads retain a completed document while retrying failed subject links.
  Uncertain file inserts are read back by their unique storage path; retries
  reuse the same object and preserve bytes when commit status is unknown.
  Image preparation handles selection races and releases preview URLs.
- Setup has labeled controls, meaningful button names, reliable slug checks,
  founder-link recovery and a fresh draft for another department. Failed
  requests restore usable controls. EN/DE copy covers these states.
- Moderation, invite management, visibility changes and comment deletion check
  returned rows instead of treating a zero-row refusal as success. Report
  deletion handles the file/report cascade correctly.
- Storage cleanup excludes objects less than an hour old and checks its
  displayed candidates again before removal. Failed reads remain visible.
- Missing previews offer a fresh-link retry, downloads request download URLs,
  malformed file IDs return 404, and database failures reach error pages
  instead of being displayed as empty archives or missing documents.
- Session refresh cookies reach both the server render and redirect response.
  Pinned-only deployments now receive tenant middleware behavior.
- Muted text is darker, locale negotiation respects language tags and quality
  values, and platform privacy copy accurately describes server-side access
  through the current visitor's session.
- Added portable SQL tests, component/security regressions and a CI workflow.
  The demo seed now uses ordinary invite enrollment, valid owner-scoped paths
  and transactional failures; reruns preserve unrelated records.

## Verification

Verification passed: **93 Vitest tests, 200 SQL assertions, two demo seed smoke
runs, 12 local production HTTP checks, TypeScript and a production build**.
Browser checks covered English/German switching, labeled setup controls,
automatic slug derivation, step/reload recovery and the cookie notice at a
390 × 844 mobile viewport and the default desktop viewport. The mobile page
had no horizontal overflow and no captured console warnings/errors. The
notice no longer blocks the setup button. No hosted account was created.

Commands:

```sh
npm run typecheck
npm test
npm run build
git diff --check
```

`npm test` runs Vitest, 200 SQL assertions in separate disposable PGlite
databases, and a seed smoke test twice. Both full schemas are installed twice
to exercise their documented upgrade path. Authorization tests use `anon` and
`authenticated`; the owner role is used only to arrange fixtures. New SQL,
browser isolation, founder and selected UI regressions failed before their
corresponding fixes and passed afterward.

These local tests do not simulate the complete hosted Supabase Auth or Storage
services. There is no configured integration environment in this checkout.
The native PostgreSQL runner was not executed because Bash/PostgreSQL binaries
are unavailable. A current npm advisory refresh after adding test dependencies
was blocked by automatic approval review because it exports dependency
metadata to the public npm registry. No clean current dependency-audit result
is claimed for the final lockfile.

The scan tool reported aggregate usage across four task workers: 56,973,423
total tokens, including 55,268,096 cached input tokens; 1,497,952 uncached input
tokens and 207,375 output tokens. This is the tool's rollout measurement, not
a billing estimate.

## Deployment and data migration

1. Review and back up the target databases. The new comment-report deduplication
   keeps the earliest report per reporter/comment and removes later duplicates;
   archive those rows first if their history must be preserved.
2. Apply `db/control-plane.sql` to the control-plane project and
   `db/tenant-schema.sql` to every tenant project. Deploy the matching rebuilt
   app so newly copied/generated setup SQL includes founder verification.
3. For an unclaimed tenant, install personalized SQL containing the verifier
   and use its private founder link. A plain fresh schema deliberately refuses
   signup without that verifier. Follow [founder setup and recovery](docs/AUDIT-BOOTSTRAP.md),
   including pinned installations. Already claimed tenants retain their admin.
4. Inspect historical malformed usernames/reports before validating the new
   constraints. `NOT VALID` preserves existing rows but new writes and updates
   must satisfy the constraints. Previously forged counters are not repaired.
   A tenant already claimed by an attacker needs owner-led account recovery.
5. Smoke-test a disposable tenant on the target hosting environment before
   rolling out broadly. Reconnect unfinished OAuth setup sessions: legacy raw
   token envelopes are intentionally rejected by the new format.

Rolling back only the app does not undo database grants or migrations. Do not
restore the vulnerable SQL to work around a setup problem; recover the founder
verifier or correct incompatible clients instead.

## Remaining engineering work

The [storage hardening portfolio](docs/security-hardening/hardening.md) compares
the current soft accounting with enforceable admission. The largest remaining
issue is real storage admission and accounting. A
tenant-owned admission service with reservations and verified byte counts is
an architectural option, not a fix already delivered. It must deny bypasses
through raw upload/overwrite APIs and handle failures, retries and cleanup.

Cleanup still has a short database-recheck-to-Storage-removal race. Upload
recovery state lasts for the mounted form; a reload during an uncertain write
can leave an object for later cleanup. Signed URLs can outlive a user's ban
until expiry. Direct RLS-permitted file deletion also bypasses RPC-only audit
logging, although it does not bypass ownership authorization.

Rate limits and slug caching are process-local. Confirm that the production
proxy sanitizes forwarded headers, and avoid static pins overlapping directory
slugs: a pin can fill a gap when a directory lookup returns no active row,
including a suspended row. These deployment assumptions were not verified
against a hosted instance. Ko-fi is an explicitly trusted third-party script
on marketing pages.

The remaining integration checks are: two independent browser/tenant sessions;
fresh-founder and invited-member signup with email confirmation both enabled
and disabled; password reset; account switching during OAuth; provisioning
resume and deletion; real byte uploads/downloads and interrupted writes;
cleanup during uploads; and simultaneous registration/quota transactions.
Use disposable projects and accounts for these checks.
