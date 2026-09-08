# Security Review: OpenDepartment

## Scope

Repository-wide source audit of baseline commit ebe4fabb10b4ab8eb5dcc6eed4ede372f76a0c80. User-authorized remediation is saved in the current working tree and summarized in AUDIT.md; findings retain original baseline evidence.

- Scan mode: repository
- Target kind: git_revision
- Target ID: target_sha256_4323040279c91b15a1fdba50e813303e945f8c2e68e2051438fdf71d155016ff
- Revision: ebe4fabb10b4ab8eb5dcc6eed4ede372f76a0c80
- Inventory strategy: repository
- Included paths: .
- Excluded paths: none
- Runtime or test status: 93 Vitest tests and200 SQL assertions passed. Both schemas applied twice, seed smoke passed twice. TypeScript/build and12 loopback HTTP checks passed. Desktop/mobile390x844 setup and locale checks passed; no captured mobile console errors. Hosted integrations not run.
- Artifacts reviewed: .claude/launch.json, .env.example, .gitignore, .vercelignore, CLAUDE.md, README.md, db/control-plane.sql, db/seed-demo.sql, db/tenant-schema.sql, db/test/00-shim.sql, db/test/01-helpers.sql, db/test/02-rls-tests.sql, db/test/03-control-plane-tests.sql, db/test/README.md, db/test/run.sh, globals.d.ts, next-env.d.ts, next.config.ts, package.json, postcss.config.mjs, scripts/build-schema.mjs, src/app/account/loading.tsx, src/app/account/login/page.tsx, src/app/account/page.tsx, src/app/api/setup/deprovision/route.ts, src/app/api/setup/oauth/callback/route.ts, src/app/api/setup/oauth/start/route.ts, src/app/api/setup/oauth/status/route.ts, src/app/api/setup/probe/route.ts, src/app/api/setup/provision/route.ts, src/app/d/\[slug\]/access-denied/page.tsx, src/app/d/\[slug\]/admin/loading.tsx, src/app/d/\[slug\]/admin/page.tsx, src/app/d/\[slug\]/auth/callback/route.ts, src/app/d/\[slug\]/auth/update-password/page.tsx, src/app/d/\[slug\]/error.tsx, src/app/d/\[slug\]/file/\[id\]/loading.tsx, src/app/d/\[slug\]/file/\[id\]/not-found.tsx, src/app/d/\[slug\]/file/\[id\]/page.tsx, src/app/d/\[slug\]/join/page.tsx, src/app/d/\[slug\]/layout.tsx, src/app/d/\[slug\]/legal/imprint/page.tsx, src/app/d/\[slug\]/legal/privacy/page.tsx, src/app/d/\[slug\]/legal/terms/page.tsx, src/app/d/\[slug\]/loading.tsx, src/app/d/\[slug\]/login/page.tsx, src/app/d/\[slug\]/not-found.tsx, src/app/d/\[slug\]/onboarding/page.tsx, src/app/d/\[slug\]/page.tsx, src/app/d/\[slug\]/upload/loading.tsx, src/app/d/\[slug\]/upload/page.tsx, src/app/d/\[slug\]/vault/loading.tsx, src/app/d/\[slug\]/vault/page.tsx, src/app/directory/loading.tsx, src/app/directory/page.tsx, src/app/error.tsx, src/app/global-error.tsx, src/app/globals.css, src/app/icon.tsx, src/app/layout.tsx, src/app/legal/\[doc\]/page.tsx, src/app/new/page.tsx, src/app/not-found.tsx, src/app/opengraph-image.tsx, src/app/page.tsx, src/app/report/page.tsx, src/app/robots.ts, src/app/sitemap.ts, src/components/CookieNotice.tsx, src/components/FileMeta.tsx, src/components/KindIcon.tsx, src/components/KofiButton.tsx, src/components/LanguageToggle.tsx, src/components/MarketingShell.tsx, src/components/ReportForm.tsx, src/components/Seal.tsx, src/components/Skeleton.tsx, src/components/Spinner.tsx, src/components/T.tsx, src/components/account/AccountLoginForm.tsx, src/components/account/DepartmentRow.tsx, src/components/admin/AdminAudit.tsx, src/components/admin/AdminDanger.tsx, src/components/admin/AdminFiles.tsx, src/components/admin/AdminInvites.tsx, src/components/admin/AdminPanel.tsx, src/components/admin/AdminReports.tsx, src/components/admin/AdminSettings.tsx, src/components/admin/AdminStorage.tsx, src/components/admin/AdminSubjects.tsx, src/components/admin/AdminUsers.tsx, src/components/admin/types.ts, src/components/dept/CommentSection.tsx, src/components/dept/DeleteFileButton.tsx, src/components/dept/DeptBanner.tsx, src/components/dept/DeptFooter.tsx, src/components/dept/DeptHeader.tsx, src/components/dept/DeptLink.tsx, src/components/dept/DeptLoginForm.tsx, src/components/dept/DeptPasswordForm.tsx, src/components/dept/DeptUsernameForm.tsx, src/components/dept/FileCard.tsx, src/components/dept/FileViewer.tsx, src/components/dept/ReportButton.tsx, src/components/dept/UploadForm.tsx, src/components/dept/VaultBrowser.tsx, src/components/dept/VoteButtons.tsx, src/components/setup/ControlAuthPanel.tsx, src/components/setup/SetupWizard.tsx, src/lib/control/browser.ts, src/lib/control/cache.ts, src/lib/control/client.ts, src/lib/control/departments.ts, src/lib/control/dev.ts, src/lib/i18n/constants.ts, src/lib/i18n/detect.ts, src/lib/i18n/dictionary.ts, src/lib/i18n/provider.tsx, src/lib/legal.ts, src/lib/rate-limit.ts, src/lib/seo.ts, src/lib/setup/credentials.ts, src/lib/setup/oauth-session.ts, src/lib/setup/origin.ts, src/lib/setup/supabase-management.ts, src/lib/tenant/auth.ts, src/lib/tenant/branding.ts, src/lib/tenant/client.ts, src/lib/tenant/context.tsx, src/lib/tenant/cookies.ts, src/lib/tenant/legal-page.tsx, src/lib/tenant/legal.ts, src/lib/tenant/scrub.ts, src/lib/tenant/server.ts, src/lib/tenant/types.ts, src/middleware.ts, tsconfig.json

Limitations and exclusions:
- 137 of 140 original tracked paths source-reviewed; lockfile third-party internals and two static font binaries explicitly excluded.
- No hosted Supabase credentials or native PostgreSQL integration runtime available. SQL concurrency and hosted OAuth/Auth/Storage require separate integration verification.
- Final online dependency advisory refresh was blocked by automatic approval review because it exports dependency metadata to npm.
- Ten findings have worktree fixes; storage-quota-bypass remains open. Source review completion is not a claim of production remediation.
- Excluded src/assets/fonts/\*.ttf: Static third-party font binary internals excluded; local references and CSP reviewed.
- Excluded package-lock.json: Dependency manifest/locked versions inspected and original dependency audit run; third-party package implementations are outside source review except supporting Supabase/Next client traces. Final online advisory refresh for added test dependencies blocked by automatic approval review.

### Scan Summary

| Field | Value |
| --- | --- |
| Scan outcome | completed |
| Reportable findings | 11 |
| Severity mix | high: 3, medium: 6, low: 2 |
| Confidence mix | high: 11 |
| Coverage | partial |
| Validation mode | Independent source reviews and parent source validation, Vitest, disposable PostgreSQL through PGlite, production build, loopback HTTP checks and browser verification |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

OpenDepartment is a Next.js/React parody document archive with two Supabase authority domains: the platform control plane stores operators, department listings and abuse reports; each tenant project stores membership, archive metadata and private Storage objects. Normal startup is npm dev or build/start (package.json:6). Registry resolution obtains tenant URL/public key, server components query using the visitor's tenant session, and browser components access tenant APIs directly (src/lib/control/departments.ts:43; src/lib/tenant/server.ts:23; src/app/d/\[slug\]/layout.tsx:102). Browser uploads go directly to tenant Storage, followed by metadata insertion (src/components/dept/UploadForm.tsx:129; src/components/dept/UploadForm.tsx:140). Supported alternatives are environment-pinned departments without a control plane and optional OAuth-backed Supabase project provisioning/deletion (src/lib/control/dev.ts:42; src/app/api/setup/provision/route.ts:55; src/app/api/setup/deprovision/route.ts:49). This is architecture mapping, not completed audit coverage.

### Assets

- Tenant archive metadata, comments, votes, reports and membership; private file objects in department-files/\<userId\>/\<randomUUID\>-\<sanitizedName\> (db/tenant-schema.sql:969; src/components/dept/UploadForm.tsx:129; src/lib/tenant/types.ts:78).
- Member identities, administrator/ban flags and email addresses; emails are available to their owner or tenant administrators, with privileged listings checked inside database RPCs (db/tenant-schema.sql:393; db/tenant-schema.sql:684; db/tenant-schema.sql:1042).
- Control-plane operator identity, ownership of registered slugs, project coordinates, listing visibility and platform suspension decisions (db/control-plane.sql:51; db/control-plane.sql:238; db/control-plane.sql:247; db/control-plane.sql:251).
- Separate control and tenant sessions; tenant cookie name od-\<slug\> and path /d/\<slug\> (src/lib/control/browser.ts:12; src/lib/tenant/cookies.ts:17).
- Supabase Management API token, OAuth client secret and temporary project database password; these convey external organization/project/database authority beyond ordinary tenant membership (src/lib/setup/oauth-session.ts:72; src/lib/setup/supabase-management.ts:35; src/app/api/setup/provision/route.ts:167).
- Abuse-report contact details and report integrity in the control plane; anonymous callers submit through a bounded RPC rather than table insertion (db/control-plane.sql:170; db/control-plane.sql:288; db/control-plane.sql:305).
- Tenant storage allocation, platform outbound-request capacity and setup spending; controls have different enforcement points (db/tenant-schema.sql:553; db/tenant-schema.sql:1182; src/lib/rate-limit.ts:17; src/app/api/setup/provision/route.ts:69).

### Trust Boundaries

- Public browser → registry: public resolution exposes active department URL/public key and branding regardless of unlisted visibility; public_directory lists only active public departments. Owner mutation is restricted by RLS and column grants; registration is authenticated and capped at three listings (db/control-plane.sql:333; db/control-plane.sql:339; db/control-plane.sql:342; db/control-plane.sql:238; db/control-plane.sql:251; db/control-plane.sql:368; db/control-plane.sql:381).
- Registry/environment → tenant network destination: registered URLs are constrained to https://\<ref\>.supabase.co or .in and known secret-key formats are rejected at database writes. STATIC_DEPARTMENTS, falling back to DEV_DEPARTMENTS, is trusted deployment configuration and has no equivalent URL/key validation before its values reach server and browser clients (db/control-plane.sql:59; db/control-plane.sql:111; db/control-plane.sql:147; src/lib/control/dev.ts:42; src/lib/control/dev.ts:49; src/lib/tenant/server.ts:23).
- Tenant browser/session → tenant database: requireMember checks verified user, profile, ban state and username for pages; the database independently enforces active membership for file reads/inserts, column privileges for profile/file updates, and is_admin inside privileged RPCs. The files_public view uses security_invoker (src/lib/tenant/auth.ts:37; src/lib/tenant/auth.ts:56; db/tenant-schema.sql:1060; db/tenant-schema.sql:1064; db/tenant-schema.sql:1037; db/tenant-schema.sql:1086; db/tenant-schema.sql:684; db/tenant-schema.sql:1153).
- Signup → membership/admin grant: auth.users trigger locks settings, grants the first signup administrator authority and marks claimed; subsequent signup requires open_join or an available invite, with locked invite usage accounting and optional administrator grant (db/tenant-schema.sql:419; db/tenant-schema.sql:433; db/tenant-schema.sql:437; db/tenant-schema.sql:445; db/tenant-schema.sql:460; db/tenant-schema.sql:473).
- Member browser → tenant Storage: private department-files bucket accepts inserts only beneath auth.uid() for an active member, reads for active members, and deletes by folder owner or administrator. Upload bytes precede metadata insertion. The bucket enforces a per-object size cap; the aggregate member quota is a separate metadata INSERT trigger (db/tenant-schema.sql:1182; db/tenant-schema.sql:1217; db/tenant-schema.sql:1226; db/tenant-schema.sql:1231; db/tenant-schema.sql:553; src/components/dept/UploadForm.tsx:132; src/components/dept/UploadForm.tsx:140).
- Tenant server page → signed file capability → browser: using the member's session, the server reads files_public and asks Storage for a 3600-second signed URL; the URL is then rendered into direct media/PDF consumers (src/app/d/\[slug\]/file/\[id\]/page.tsx:53; src/app/d/\[slug\]/file/\[id\]/page.tsx:66; src/app/d/\[slug\]/file/\[id\]/page.tsx:163; src/components/dept/FileViewer.tsx:83; src/components/dept/FileViewer.tsx:129).
- Tenant administrator → content purge: purge_department checks is_admin and typed department name, deletes archive rows and other member identities, preserves caller identity, keeps the department claimed/closed, and returns file paths. Browser Storage removal is separate and reports failures; orphan cleanup is independently exposed to administrators (db/tenant-schema.sql:859; db/tenant-schema.sql:861; db/tenant-schema.sql:877; db/tenant-schema.sql:885; db/tenant-schema.sql:897; db/tenant-schema.sql:903; db/tenant-schema.sql:912; src/components/admin/AdminDanger.tsx:102; src/components/admin/AdminStorage.tsx:47).
- Authenticated operator → candidate project probe: server requires control authentication, account/address limits, closed Supabase URL pattern and rejection of known secret-key forms before anonymous department_identity RPC (src/app/api/setup/probe/route.ts:30; src/app/api/setup/probe/route.ts:73; src/app/api/setup/probe/route.ts:80; src/app/api/setup/probe/route.ts:104; src/app/api/setup/probe/route.ts:110; src/lib/tenant/branding.ts:141).
- Operator/browser → OAuth callback: sealed state includes initiating control user ID; callback checks cookie equality, decrypts verifier and confirms current user matches state before PKCE code exchange. Stored token is then an encrypted raw Management token, with httpOnly, SameSite=Lax, production Secure, /api/setup path and browser maxAge 3600 (src/app/api/setup/oauth/start/route.ts:57; src/app/api/setup/oauth/callback/route.ts:65; src/app/api/setup/oauth/callback/route.ts:73; src/app/api/setup/oauth/callback/route.ts:86; src/lib/setup/oauth-session.ts:78; src/lib/setup/oauth-session.ts:119).
- Authenticated setup caller + token cookie → external Management API: provision accepts SQL and optional resumed project ref from request JSON, checks SQL length/ref syntax, validates project access through Supabase, executes SQL, reads a public key and changes auth configuration. Exact SQL and resumed ref are browser-controlled; no server-created manifest/digest binds them to an earlier creation. External token authorization is an important independent control (src/app/api/setup/provision/route.ts:80; src/app/api/setup/provision/route.ts:104; src/app/api/setup/provision/route.ts:116; src/app/api/setup/provision/route.ts:131; src/app/api/setup/provision/route.ts:258; src/lib/setup/supabase-management.ts:250).
- Listing owner + Management token → project deletion: deprovision verifies control user and reads the slug under owner RLS, derives project ref from the owned row's URL, then calls Supabase project GET/DELETE. Listing owners can independently update those project coordinates. UI typed confirmation is a client-side step; backend authorization is owner RLS plus token scope. Listing deletion follows separately and reads back deleted rows (src/app/api/setup/deprovision/route.ts:57; src/app/api/setup/deprovision/route.ts:86; src/app/api/setup/deprovision/route.ts:96; src/app/api/setup/deprovision/route.ts:146; db/control-plane.sql:252; src/components/account/DepartmentRow.tsx:245; src/components/account/DepartmentRow.tsx:294).
- Host/proxy → OAuth/auth origins and IP limits: requestOrigin trusts x-forwarded-host then Host, and x-forwarded-proto; these determine OAuth callback URLs and tenant site_url/uri_allow_list. Rate-limit address keys trust the first x-forwarded-for value. Deployment proxy behavior is therefore part of these controls (src/lib/setup/origin.ts:11; src/lib/setup/origin.ts:13; src/app/api/setup/oauth/start/route.ts:58; src/app/api/setup/provision/route.ts:280; src/lib/rate-limit.ts:59).
- Repository schema → privileged installation: predev/prebuild read db/tenant-schema.sql into src/lib/tenant/schema-sql.generated.ts; /new provides it to the browser, which personalizes and copies/downloads it or posts it to provision. Manual SQL-editor execution and optional Management API SQL execution are privileged owner workflows (package.json:6; scripts/build-schema.mjs:20; scripts/build-schema.mjs:31; src/app/new/page.tsx:44; src/components/setup/SetupWizard.tsx:69; src/components/setup/SetupWizard.tsx:388; src/components/setup/SetupWizard.tsx:400; src/components/setup/SetupWizard.tsx:489).

### Attacker Capabilities

- Unauthenticated internet visitors can access public pages, discover public listings, resolve a known active slug and submit platform abuse reports; they do not thereby obtain tenant membership or operator ownership (db/control-plane.sql:333; db/control-plane.sql:342; db/control-plane.sql:288).
- A person who can obtain a tenant URL/public key can call Supabase directly, bypassing UI restrictions. On an unclaimed project, first signup intentionally grants admin authority; on a claimed project, the signup trigger enforces the configured door/invite policy (db/tenant-schema.sql:437; db/tenant-schema.sql:445; db/tenant-schema.sql:460).
- An ordinary active tenant member controls their uploads, metadata and direct authenticated API requests but should not gain administrator flags, other tenants' sessions or unrestricted access to member emails (src/components/dept/UploadForm.tsx:129; db/tenant-schema.sql:1037; db/tenant-schema.sql:1042).
- A control-plane account can register listings and mutate its own allowed coordinates, independently of tenant membership. An operator using their own Management token already has the external authority represented by that token; accepting their own SQL/ref is not alone a privilege escalation (db/control-plane.sql:252; db/control-plane.sql:372; src/app/api/setup/provision/route.ts:75; src/lib/setup/supabase-management.ts:35).
- Tenant administrators legitimately possess member-management, moderation, email-view and archive-purge authority. Platform listing suspension/deletion, tenant content purge and Supabase project deletion must not be conflated (db/tenant-schema.sql:684; db/tenant-schema.sql:728; db/tenant-schema.sql:859; db/control-plane.sql:247; src/app/api/setup/deprovision/route.ts:146).
- An attacker is not assumed to control deployment environment, OAuth client secret, the reverse proxy, the victim browser, or the victim's Supabase account. Cookie replay/account-switch or same-site cross-origin attack stories need those specific prerequisites established; encryption does not itself prove replay prevention (src/lib/setup/oauth-session.ts:89; src/app/api/setup/oauth/callback/route.ts:86; src/app/api/setup/provision/route.ts:75).

### Security Objectives

- Tenant data access and privileged mutation must be enforced by the tenant's database/Storage authority for direct API callers, not merely by page guards (db/tenant-schema.sql:1060; db/tenant-schema.sql:684; db/tenant-schema.sql:1217).
- Control-plane ownership and suspension decisions must survive direct API writes; public-key storage must reject recognized service/secret keys (db/control-plane.sql:147; db/control-plane.sql:238; db/control-plane.sql:247; db/control-plane.sql:251).
- Keep control-plane identity, tenant membership, tenant administrator authority and external Supabase organization authority independently bound to their operations (src/lib/tenant/cookies.ts:17; db/tenant-schema.sql:393; src/app/api/setup/oauth/callback/route.ts:73; src/app/api/setup/deprovision/route.ts:86).
- Protect setup credentials in transit and browser storage, and bind destructive/setup actions to the intended account, target and payload; token lifecycle claims must match every exit (src/lib/setup/oauth-session.ts:78; src/lib/setup/oauth-session.ts:119; src/app/api/setup/provision/route.ts:258; src/app/api/setup/deprovision/route.ts:146).
- Present deletion outcomes accurately across SQL rows, Storage bytes, control listing and external project; do not imply one operation erases all resources (db/tenant-schema.sql:912; src/components/admin/AdminDanger.tsx:102; src/components/account/DepartmentRow.tsx:294).
- Bound uploads and platform requests at actual consumers, with explicit distinction between bucket object limit, metadata quota and process-local setup limits (db/tenant-schema.sql:553; db/tenant-schema.sql:1182; src/lib/rate-limit.ts:17).

### Assumptions

- User context authorizes a full audit and judgment based on the codebase; this independent pass is restricted to offline source-backed architecture. No supplied authoritative threat model or knowledge base was provided. Policy resolver returned no policy for repository root, src, db or scripts.
- Deployed environment values, actual Supabase schemas/policies, OAuth scopes, cloud logs, storage-service behavior and reverse-proxy header sanitization were not inspected. No deployed project coordinates or credential material were read.
- Registry and pin behavior differs from the absolute precedence/suspension guarantee: only a successful active registry result wins; null/error—including a suspended listing—falls back to a matching configured pin. Middleware also caches results for 60 seconds (src/lib/control/departments.ts:47; src/lib/control/departments.ts:50; src/lib/control/cache.ts:7; src/lib/control/cache.ts:51; README.md:391). Impact requires a configured conflicting pin or registry failure, not an untrusted user's ability to edit environment.
- Pinned-only startup bypasses tenant middleware because dispatch returns before tenant routing when control credentials are absent. Page requireMember and Supabase RLS still operate; middleware token refresh and canonical-slug redirect do not (src/middleware.ts:130; src/middleware.ts:177; src/lib/tenant/auth.ts:37). The layout uses the incoming slug for browser cookie configuration while the server client uses resolved dept.slug (src/app/d/\[slug\]/layout.tsx:103; src/lib/tenant/server.ts:19).
- The absence of a standing tenant service key is narrower than README/legal claims that the platform cannot read department contents. Server components receive tenant session cookies, read archive metadata and mint signed file URLs as the visitor (README.md:66; src/lib/legal.ts:180; src/lib/tenant/legal.ts:174; src/lib/tenant/server.ts:23; src/app/d/\[slug\]/file/\[id\]/page.tsx:53; src/app/d/\[slug\]/file/\[id\]/page.tsx:66).
- OAuth documentation says the token is cleared on every exit except STILL_STARTING. Code also retains it on health refusal and several early validation/rate-limit exits; deprovision likewise has early exits before finish. Cookie maxAge is a browser expiry setting; seal/unseal contains no server-enforced timestamp, account ID or revocation state (README.md:245; src/app/api/setup/provision/route.ts:69; src/app/api/setup/provision/route.ts:104; src/app/api/setup/provision/route.ts:238; src/app/api/setup/deprovision/route.ts:62; src/lib/setup/oauth-session.ts:78; src/lib/setup/oauth-session.ts:89).
- Claim that a token cookie cannot be replayed by someone holding the cookie because encryption key stays server-side is not established by the consumer: the server accepts/decrypts the cookie as presented. A separate authenticated control session is required. This is a documentation/control distinction, not a validated replay exploit (src/lib/setup/oauth-session.ts:21; src/app/api/setup/provision/route.ts:61; src/app/api/setup/provision/route.ts:75).
- Storage quota measures registered metadata bytes. Browser cleanup on failed metadata insertion and administrative orphan sweep are compensating workflows; aggregate quota does not appear in Storage insert policy. Bucket limit synchronization catches errors and warns, so a failed update can leave the previous effective bucket cap (db/tenant-schema.sql:560; db/tenant-schema.sql:1217; src/components/dept/UploadForm.tsx:162; src/components/admin/AdminStorage.tsx:47; db/tenant-schema.sql:1202).
- Image metadata stripping is best-effort browser functionality, not a Storage invariant; unsupported images and caught parser failures preserve the original file (src/lib/tenant/scrub.ts:182; src/lib/tenant/scrub.ts:186; src/lib/tenant/scrub.ts:211).
- CSP has per-request nonce/strict-dynamic and Supabase destination allowances; HTTP security headers are configured separately. Tenant documents render directly from Supabase, while Ko-fi loads third-party script and Vercel Analytics is globally mounted (src/middleware.ts:78; src/middleware.ts:83; src/middleware.ts:119; next.config.ts:23; src/components/dept/FileViewer.tsx:129; src/components/KofiButton.tsx:7; src/app/layout.tsx:132).
- Build/schema generation uses Node paths derived from the script location. Existing SQL tests use a disposable PostgreSQL shim through Bash and PGBIN; this is developer test tooling rather than a deployed service, and its documented runtime is not proof of actual hosted Supabase behavior (scripts/build-schema.mjs:17; scripts/build-schema.mjs:20; db/test/run.sh:21; db/test/run.sh:26; db/test/README.md:24).

## Findings

| Finding | Severity | Confidence | Detailed write-up |
| --- | --- | --- | --- |
| [Newly published departments can be claimed by the first stranger to sign up](#finding-1) | high | high | inline below |
| [Anonymous callers can delete exhibits through a nullable authorization check](#finding-2) | high | high | inline below |
| [A global Supabase browser singleton mixes department and platform credentials](#finding-3) | high | high | inline below |
| [Unrestricted file INSERT columns allow forged ranking and moderation counters](#finding-4) | medium | high | inline below |
| [Members can bypass the configured storage quota through direct uploads](#finding-5) | medium | high | inline below |
| [Deleting an operator profile bypasses department suspension](#finding-6) | medium | high | inline below |
| [Targetless reports bypass duplicate protection and bury the moderation queue](#finding-7) | medium | high | inline below |
| [Concurrent registration bypasses the three-department account cap](#finding-8) | medium | high | inline below |
| [Backslash redirect targets escape the account login same-origin check](#finding-9) | medium | high | inline below |
| [Direct profile updates bypass banned-member and username validation](#finding-10) | low | high | inline below |
| [Setup authorization survives replacement of the control-plane account](#finding-11) | low | high | inline below |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct evidence supports the finding with no material unresolved blocker. |
| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |
| low | Evidence is incomplete and the item is retained only for explicit follow-up. |

<a id="finding-1"></a>

### [1] Newly published departments can be claimed by the first stranger to sign up

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Independently traced against the audited source; local regression failures confirm applicable SQL and browser-client behaviors. |
| Category | authentication |
| CWE | CWE-862 |
| Affected lines | db/tenant-schema.sql:433-440, db/tenant-schema.sql:477-478, src/components/setup/SetupWizard.tsx:603-621, db/control-plane.sql:333-350 |

#### Summary

An attacker wins initial department administration and can read subsequently added member emails, change admission rules, issue privileged invites, delete content or purge the archive. Owner recovery requires direct Supabase administration.

#### Root Cause

SetupWizard rejects already claimed projects, then registers the directory row while the tenant remains unclaimed. public_directory and resolve_department expose new public slugs and their tenant coordinates before the founder creates a tenant account. Any caller can submit a Supabase signup with the published anon key. handle_new_user sees settings.claimed=false, skips invite validation, and sets make_admin=true.

**Entry point and control** — `db/tenant-schema.sql:433-440`

select not s.claimed ... for update; if unclaimed then make_admin := true; update public.settings set claimed = true;

```
  select not s.claimed, s.open_join
    into unclaimed, open_door
    from public.settings s where s.id for update;

  if unclaimed then
    -- The first account through the door founds the department.
    make_admin := true;
    update public.settings set claimed = true where id;
```

**Supporting control** — `db/tenant-schema.sql:477-478`

insert into public.profiles (id, is_admin) values (new.id, make_admin)

```
  insert into public.profiles (id, is_admin) values (new.id, make_admin)
  on conflict (id) do nothing;
```

**Supporting control** — `src/components/setup/SetupWizard.tsx:603-621`

if (probe.claimed) ... return; ... rpc('register_department', ... vis: visibility)

```
    // 2. An already-claimed project means they pointed us at a department that
    //    exists. Registering it here would hand its address to the wrong person.
    if (probe.claimed) {
      setError(t("setup.claimed"));
      setBusy(false);
      return;
    }

    // 3. Register the slug. RLS ties the row to the signed-in operator.
    const { error: rpcError } = await createControlBrowserClient().rpc(
      "register_department",
      {
        want_slug: slug,
        url: cleanUrl,
        key: anonKey.trim(),
        name: name.trim() || "Untitled Department",
        tag: null,
        vis: visibility,
      }
```

**Supporting control** — `db/control-plane.sql:333-350`

resolve_department returns supabase_url, anon_key; public_directory exposes active public slugs

```
create or replace function public.resolve_department(want text)
returns table (slug text, supabase_url text, anon_key text,
               display_name text, tagline text, visibility text)
language sql stable security definer set search_path = public as $fn$
  select d.slug, d.supabase_url, d.anon_key, d.display_name, d.tagline, d.visibility
    from public.departments d
   where d.slug = lower(trim(want)) and d.status = 'active';
$fn$;

create or replace function public.public_directory(limit_to integer default 60)
returns table (slug text, display_name text, tagline text, created_at timestamptz)
language sql stable security definer set search_path = public as $fn$
  select d.slug, d.display_name, d.tagline, d.created_at
    from public.departments d
   where d.visibility = 'public' and d.status = 'active'
   order by d.created_at desc
   limit greatest(1, least(coalesce(limit_to, 60), 200));
$fn$;
```

#### Validation

SetupWizard rejects already claimed projects, then registers the directory row while the tenant remains unclaimed. public_directory and resolve_department expose new public slugs and their tenant coordinates before the founder creates a tenant account. Any caller can submit a Supabase signup with the published anon key. handle_new_user sees settings.claimed=false, skips invite validation, and sets make_admin=true. Counterevidence: This is explicitly documented behavior, including a warning that the first signup must be the owner. The settings row lock prevents two simultaneous founders; it does not establish who is entitled to found the department. Unlisted random slugs reduce discoverability but public directory entries have no such protection.

Validation method: parent source trace and applicable local regression tests

**Entry point and control** — `db/tenant-schema.sql:433-440`

select not s.claimed ... for update; if unclaimed then make_admin := true; update public.settings set claimed = true;

```
  select not s.claimed, s.open_join
    into unclaimed, open_door
    from public.settings s where s.id for update;

  if unclaimed then
    -- The first account through the door founds the department.
    make_admin := true;
    update public.settings set claimed = true where id;
```

**Supporting control** — `db/tenant-schema.sql:477-478`

insert into public.profiles (id, is_admin) values (new.id, make_admin)

```
  insert into public.profiles (id, is_admin) values (new.id, make_admin)
  on conflict (id) do nothing;
```

**Supporting control** — `src/components/setup/SetupWizard.tsx:603-621`

if (probe.claimed) ... return; ... rpc('register_department', ... vis: visibility)

```
    // 2. An already-claimed project means they pointed us at a department that
    //    exists. Registering it here would hand its address to the wrong person.
    if (probe.claimed) {
      setError(t("setup.claimed"));
      setBusy(false);
      return;
    }

    // 3. Register the slug. RLS ties the row to the signed-in operator.
    const { error: rpcError } = await createControlBrowserClient().rpc(
      "register_department",
      {
        want_slug: slug,
        url: cleanUrl,
        key: anonKey.trim(),
        name: name.trim() || "Untitled Department",
        tag: null,
        vis: visibility,
      }
```

**Supporting control** — `db/control-plane.sql:333-350`

resolve_department returns supabase_url, anon_key; public_directory exposes active public slugs

```
create or replace function public.resolve_department(want text)
returns table (slug text, supabase_url text, anon_key text,
               display_name text, tagline text, visibility text)
language sql stable security definer set search_path = public as $fn$
  select d.slug, d.supabase_url, d.anon_key, d.display_name, d.tagline, d.visibility
    from public.departments d
   where d.slug = lower(trim(want)) and d.status = 'active';
$fn$;

create or replace function public.public_directory(limit_to integer default 60)
returns table (slug text, display_name text, tagline text, created_at timestamptz)
language sql stable security definer set search_path = public as $fn$
  select d.slug, d.display_name, d.tagline, d.created_at
    from public.departments d
   where d.visibility = 'public' and d.status = 'active'
   order by d.created_at desc
   limit greatest(1, least(coalesce(limit_to, 60), 200));
$fn$;
```

Limitations:
- No deployed Supabase service was probed; source evidence describes audited revision ebe4fabb.

#### Dataflow

SetupWizard rejects already claimed projects, then registers the directory row while the tenant remains unclaimed. public_directory and resolve_department expose new public slugs and their tenant coordinates before the founder creates a tenant account. Any caller can submit a Supabase signup with the published anon key. handle_new_user sees settings.claimed=false, skips invite validation, and sets make_admin=true.

- **Source:** Unauthenticated visitor monitoring newly public directory entries, or anyone who learns an unlisted slug before its owner finishes first signup.

- **Sink:** db/tenant-schema.sql

- **Outcome:** An attacker wins initial department administration and can read subsequently added member emails, change admission rules, issue privileged invites, delete content or purge the archive. Owner recovery requires direct Supabase administration.

**Entry point and control** — `db/tenant-schema.sql:433-440`

select not s.claimed ... for update; if unclaimed then make_admin := true; update public.settings set claimed = true;

```
  select not s.claimed, s.open_join
    into unclaimed, open_door
    from public.settings s where s.id for update;

  if unclaimed then
    -- The first account through the door founds the department.
    make_admin := true;
    update public.settings set claimed = true where id;
```

**Supporting control** — `db/tenant-schema.sql:477-478`

insert into public.profiles (id, is_admin) values (new.id, make_admin)

```
  insert into public.profiles (id, is_admin) values (new.id, make_admin)
  on conflict (id) do nothing;
```

**Supporting control** — `src/components/setup/SetupWizard.tsx:603-621`

if (probe.claimed) ... return; ... rpc('register_department', ... vis: visibility)

```
    // 2. An already-claimed project means they pointed us at a department that
    //    exists. Registering it here would hand its address to the wrong person.
    if (probe.claimed) {
      setError(t("setup.claimed"));
      setBusy(false);
      return;
    }

    // 3. Register the slug. RLS ties the row to the signed-in operator.
    const { error: rpcError } = await createControlBrowserClient().rpc(
      "register_department",
      {
        want_slug: slug,
        url: cleanUrl,
        key: anonKey.trim(),
        name: name.trim() || "Untitled Department",
        tag: null,
        vis: visibility,
      }
```

**Supporting control** — `db/control-plane.sql:333-350`

resolve_department returns supabase_url, anon_key; public_directory exposes active public slugs

```
create or replace function public.resolve_department(want text)
returns table (slug text, supabase_url text, anon_key text,
               display_name text, tagline text, visibility text)
language sql stable security definer set search_path = public as $fn$
  select d.slug, d.supabase_url, d.anon_key, d.display_name, d.tagline, d.visibility
    from public.departments d
   where d.slug = lower(trim(want)) and d.status = 'active';
$fn$;

create or replace function public.public_directory(limit_to integer default 60)
returns table (slug text, display_name text, tagline text, created_at timestamptz)
language sql stable security definer set search_path = public as $fn$
  select d.slug, d.display_name, d.tagline, d.created_at
    from public.departments d
   where d.visibility = 'public' and d.status = 'active'
   order by d.created_at desc
   limit greatest(1, least(coalesce(limit_to, 60), 200));
$fn$;
```

#### Reachability

Unauthenticated visitor monitoring newly public directory entries, or anyone who learns an unlisted slug before its owner finishes first signup.

- **Attacker:** Unauthenticated visitor monitoring newly public directory entries, or anyone who learns an unlisted slug before its owner finishes first signup.

- **Entry point:** db/tenant-schema.sql

- **Outcome:** An attacker wins initial department administration and can read subsequently added member emails, change admission rules, issue privileged invites, delete content or purge the archive. Owner recovery requires direct Supabase administration.

Limitations:
- This is explicitly documented behavior, including a warning that the first signup must be the owner. The settings row lock prevents two simultaneous founders; it does not establish who is entitled to found the department. Unlisted random slugs reduce discoverability but public directory entries have no such protection.

#### Severity

**High** — Unauthenticated visitor monitoring newly public directory entries, or anyone who learns an unlisted slug before its owner finishes first signup. An attacker wins initial department administration and can read subsequently added member emails, change admission rules, issue privileged invites, delete content or purge the archive. Owner recovery requires direct Supabase administration.

This is explicitly documented behavior, including a warning that the first signup must be the owner. The settings row lock prevents two simultaneous founders; it does not establish who is entitled to found the department. Unlisted random slugs reduce discoverability but public directory entries have no such protection.

#### Remediation

Create a high-entropy one-use founder capability during schema generation/provisioning, store only its verifier, and require it in the initial signup; complete founder claim before public listing. Preserve a deliberate local administrative recovery path.

Tests:
- The intended department founder, rather than an arbitrary first requester, should receive initial administrative rights.

<a id="finding-2"></a>

### [2] Anonymous callers can delete exhibits through a nullable authorization check

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Independently traced against the audited source; local regression failures confirm applicable SQL and browser-client behaviors. |
| Category | authorization |
| CWE | CWE-862, CWE-703 |
| Affected lines | db/tenant-schema.sql:706-723, db/tenant-schema.sql:364-372, db/tenant-schema.sql:393-399, db/tenant-schema.sql:920-926 |

#### Summary

Unauthorized destruction of exhibit metadata and cascading comments, votes, reports, subject links and view records; disclosure of the storage path. Storage bytes remain because object deletion is a separate operation. The same function also permits banned owners to delete their own exhibits because it never checks active membership.

#### Root Cause

Public tenant coordinates expose the anon key to visitors. delete_file(target, why) is SECURITY DEFINER and retains PostgreSQL's default PUBLIC EXECUTE privilege. For an anonymous caller auth.uid() is NULL and is_admin() is false. NOT (false OR owner = NULL) evaluates to NULL; PL/pgSQL IF does not enter its rejection branch. The function inserts an audit row with nullable actor_id, deletes the exhibit as table owner, and returns the storage path.

**Entry point and control** — `db/tenant-schema.sql:706-723`

returns text language plpgsql security definer ... if not (public.is_admin() or owner = auth.uid()) then ... delete from public.files where id = target; return path;

```
create or replace function public.delete_file(target uuid, why text default null)
returns text language plpgsql security definer set search_path = public as $fn$
declare path text; owner uuid;
begin
  select f.storage_path, f.owner_id into path, owner from public.files f where f.id = target;
  if path is null then raise exception 'NOT_FOUND'; end if;

  if not (public.is_admin() or owner = auth.uid()) then
    raise exception 'NOT_ALLOWED';
  end if;

  insert into public.audit_log (actor_id, action, target, detail)
  values (auth.uid(), 'file.delete', target::text,
          jsonb_build_object('storage_path', path, 'reason', why));

  delete from public.files where id = target;
  return path;
end; $fn$;
```

**Supporting control** — `db/tenant-schema.sql:364-372`

audit_log.actor_id uuid references public.profiles(id) on delete set null

```
-- 9. AUDIT LOG -- every deletion and moderation action is recorded.
create table if not exists public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target      text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
```

**Supporting control** — `db/tenant-schema.sql:393-399`

is_admin() returns coalesce(..., false)

```
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce(
    (select p.is_admin and not p.is_banned
       from public.profiles p where p.id = auth.uid()),
    false);
$fn$;
```

**Supporting control** — `db/tenant-schema.sql:920-926`

Neighbor purge_department explicitly revokes EXECUTE from anon, public; delete_file has no corresponding revoke.

```
-- Stricter than its neighbours on purpose. The other admin RPCs rely on
-- Postgres granting EXECUTE to PUBLIC and on their own is_admin() check, which
-- is enough when the worst a refused caller can do is read nothing. This one
-- deletes an archive, so the signed-out role does not get to reach the check
-- at all.
revoke execute on function public.purge_department(text) from anon, public;
grant  execute on function public.purge_department(text) to authenticated;
```

#### Validation

Public tenant coordinates expose the anon key to visitors. delete_file(target, why) is SECURITY DEFINER and retains PostgreSQL's default PUBLIC EXECUTE privilege. For an anonymous caller auth.uid() is NULL and is_admin() is false. NOT (false OR owner = NULL) evaluates to NULL; PL/pgSQL IF does not enter its rejection branch. The function inserts an audit row with nullable actor_id, deletes the exhibit as table owner, and returns the storage path. Counterevidence: RLS prevents anonymous table reads/deletes and storage object deletion; requireMember gates UI pages. Neither applies inside this SECURITY DEFINER RPC. UUID guessing is unnecessary for a former member or recipient of an exhibit link.

Validation method: parent source trace and applicable local regression tests

**Entry point and control** — `db/tenant-schema.sql:706-723`

returns text language plpgsql security definer ... if not (public.is_admin() or owner = auth.uid()) then ... delete from public.files where id = target; return path;

```
create or replace function public.delete_file(target uuid, why text default null)
returns text language plpgsql security definer set search_path = public as $fn$
declare path text; owner uuid;
begin
  select f.storage_path, f.owner_id into path, owner from public.files f where f.id = target;
  if path is null then raise exception 'NOT_FOUND'; end if;

  if not (public.is_admin() or owner = auth.uid()) then
    raise exception 'NOT_ALLOWED';
  end if;

  insert into public.audit_log (actor_id, action, target, detail)
  values (auth.uid(), 'file.delete', target::text,
          jsonb_build_object('storage_path', path, 'reason', why));

  delete from public.files where id = target;
  return path;
end; $fn$;
```

**Supporting control** — `db/tenant-schema.sql:364-372`

audit_log.actor_id uuid references public.profiles(id) on delete set null

```
-- 9. AUDIT LOG -- every deletion and moderation action is recorded.
create table if not exists public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target      text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
```

**Supporting control** — `db/tenant-schema.sql:393-399`

is_admin() returns coalesce(..., false)

```
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce(
    (select p.is_admin and not p.is_banned
       from public.profiles p where p.id = auth.uid()),
    false);
$fn$;
```

**Supporting control** — `db/tenant-schema.sql:920-926`

Neighbor purge_department explicitly revokes EXECUTE from anon, public; delete_file has no corresponding revoke.

```
-- Stricter than its neighbours on purpose. The other admin RPCs rely on
-- Postgres granting EXECUTE to PUBLIC and on their own is_admin() check, which
-- is enough when the worst a refused caller can do is read nothing. This one
-- deletes an archive, so the signed-out role does not get to reach the check
-- at all.
revoke execute on function public.purge_department(text) from anon, public;
grant  execute on function public.purge_department(text) to authenticated;
```

Limitations:
- No deployed Supabase service was probed; source evidence describes audited revision ebe4fabb.

#### Dataflow

Public tenant coordinates expose the anon key to visitors. delete_file(target, why) is SECURITY DEFINER and retains PostgreSQL's default PUBLIC EXECUTE privilege. For an anonymous caller auth.uid() is NULL and is_admin() is false. NOT (false OR owner = NULL) evaluates to NULL; PL/pgSQL IF does not enter its rejection branch. The function inserts an audit row with nullable actor_id, deletes the exhibit as table owner, and returns the storage path.

- **Source:** Signed-out remote caller holding the public tenant anon key and a known exhibit UUID; a former member can retain UUIDs before removal.

- **Sink:** db/tenant-schema.sql

- **Outcome:** Unauthorized destruction of exhibit metadata and cascading comments, votes, reports, subject links and view records; disclosure of the storage path. Storage bytes remain because object deletion is a separate operation. The same function also permits banned owners to delete their own exhibits because it never checks active membership.

**Entry point and control** — `db/tenant-schema.sql:706-723`

returns text language plpgsql security definer ... if not (public.is_admin() or owner = auth.uid()) then ... delete from public.files where id = target; return path;

```
create or replace function public.delete_file(target uuid, why text default null)
returns text language plpgsql security definer set search_path = public as $fn$
declare path text; owner uuid;
begin
  select f.storage_path, f.owner_id into path, owner from public.files f where f.id = target;
  if path is null then raise exception 'NOT_FOUND'; end if;

  if not (public.is_admin() or owner = auth.uid()) then
    raise exception 'NOT_ALLOWED';
  end if;

  insert into public.audit_log (actor_id, action, target, detail)
  values (auth.uid(), 'file.delete', target::text,
          jsonb_build_object('storage_path', path, 'reason', why));

  delete from public.files where id = target;
  return path;
end; $fn$;
```

**Supporting control** — `db/tenant-schema.sql:364-372`

audit_log.actor_id uuid references public.profiles(id) on delete set null

```
-- 9. AUDIT LOG -- every deletion and moderation action is recorded.
create table if not exists public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target      text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
```

**Supporting control** — `db/tenant-schema.sql:393-399`

is_admin() returns coalesce(..., false)

```
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce(
    (select p.is_admin and not p.is_banned
       from public.profiles p where p.id = auth.uid()),
    false);
$fn$;
```

**Supporting control** — `db/tenant-schema.sql:920-926`

Neighbor purge_department explicitly revokes EXECUTE from anon, public; delete_file has no corresponding revoke.

```
-- Stricter than its neighbours on purpose. The other admin RPCs rely on
-- Postgres granting EXECUTE to PUBLIC and on their own is_admin() check, which
-- is enough when the worst a refused caller can do is read nothing. This one
-- deletes an archive, so the signed-out role does not get to reach the check
-- at all.
revoke execute on function public.purge_department(text) from anon, public;
grant  execute on function public.purge_department(text) to authenticated;
```

#### Reachability

Signed-out remote caller holding the public tenant anon key and a known exhibit UUID; a former member can retain UUIDs before removal.

- **Attacker:** Signed-out remote caller holding the public tenant anon key and a known exhibit UUID; a former member can retain UUIDs before removal.

- **Entry point:** db/tenant-schema.sql

- **Outcome:** Unauthorized destruction of exhibit metadata and cascading comments, votes, reports, subject links and view records; disclosure of the storage path. Storage bytes remain because object deletion is a separate operation. The same function also permits banned owners to delete their own exhibits because it never checks active membership.

Limitations:
- RLS prevents anonymous table reads/deletes and storage object deletion; requireMember gates UI pages. Neither applies inside this SECURITY DEFINER RPC. UUID guessing is unnecessary for a former member or recipient of an exhibit link.

#### Severity

**High** — Signed-out remote caller holding the public tenant anon key and a known exhibit UUID; a former member can retain UUIDs before removal. Unauthorized destruction of exhibit metadata and cascading comments, votes, reports, subject links and view records; disclosure of the storage path. Storage bytes remain because object deletion is a separate operation. The same function also permits banned owners to delete their own exhibits because it never checks active membership.

RLS prevents anonymous table reads/deletes and storage object deletion; requireMember gates UI pages. Neither applies inside this SECURITY DEFINER RPC. UUID guessing is unnecessary for a former member or recipient of an exhibit link.

#### Remediation

Require non-null auth.uid() and is_active_member() before lookup/mutation, use null-safe ownership checks, revoke EXECUTE from PUBLIC and anon, grant only authenticated, and add explicit signed-out, banned-owner, other-member and valid-owner regression assertions.

Tests:
- Only an active exhibit owner or active administrator may delete an exhibit and its associated records.

<a id="finding-3"></a>

### [3] A global Supabase browser singleton mixes department and platform credentials

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Independently traced against the audited source; local regression failures confirm applicable SQL and browser-client behaviors. |
| Category | tenant-isolation |
| CWE | CWE-441, CWE-488 |
| Affected lines | src/lib/tenant/client.ts:13-20, src/lib/control/browser.ts:12-16, src/components/dept/DeptHeader.tsx:20-22, src/components/dept/DeptLoginForm.tsx:107-118, src/components/setup/ControlAuthPanel.tsx:47-53, node_modules/@supabase/ssr/src/createBrowserClient.ts:109-115 |

#### Summary

Credentials, email addresses and invite codes intended for one realm are sent to another project; signup can create an account in an attacker-owned project, exposing stored invite metadata and password hashes there. Browser reads and actions also run against stale project/session state. Do not infer that the Supabase project owner automatically sees plaintext passwords in auth logs.

#### Root Cause

DeptHeader instantiates useTenantClient even for signed-out department front doors. Both tenant and control browser factories call createBrowserClient without isSingleton:false. Installed @supabase/ssr caches one module-global browser client and returns it before inspecting later URL/key/cookie arguments. Next Link navigation retains that module instance while changing rendered branding and forms. DeptLoginForm.signUp/signInWithPassword and ControlAuthPanel then send the visitor's credentials and, for tenant signup, invite_code metadata to the previously selected project.

**Entry point and control** — `src/lib/tenant/client.ts:13-20`

return createBrowserClient(opts.supabaseUrl, opts.anonKey, { cookieOptions: tenantCookieConfig(opts.slug) });

```
export function createTenantBrowserClient(opts: {
  slug: string;
  supabaseUrl: string;
  anonKey: string;
}) {
  return createBrowserClient(opts.supabaseUrl, opts.anonKey, {
    cookieOptions: tenantCookieConfig(opts.slug),
  });
```

**Supporting control** — `src/lib/control/browser.ts:12-16`

return createBrowserClient(NEXT_PUBLIC_CONTROL_SUPABASE_URL, NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY);

```
export function createControlBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY!
  );
```

**Supporting control** — `src/components/dept/DeptHeader.tsx:20-22`

const supabase = useTenantClient();

```
  const { t } = useI18n();
  const { branding, href, slug } = useTenant();
  const supabase = useTenantClient();
```

**Supporting control** — `src/components/dept/DeptLoginForm.tsx:107-118`

supabase.auth.signUp({ email, password, options: { ... data: { invite_code: ... } } })

```
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: callback,
            // Read by handle_new_user() out of raw_user_meta_data. Sending it
            // as metadata is what lets the trigger check the code in the same
            // transaction that creates the user.
            data: invite.trim() ? { invite_code: invite.trim().toUpperCase() } : {},
          },
        });
```

**Supporting control** — `src/components/setup/ControlAuthPanel.tsx:47-53`

createControlBrowserClient(); ... signUp(creds) : signInWithPassword(creds)

```
    const supabase = createControlBrowserClient();
    const creds = { email: email.trim(), password };

    const { data, error: authError } =
      mode === "signup"
        ? await supabase.auth.signUp(creds)
        : await supabase.auth.signInWithPassword(creds);
```

**Supporting control** — `node_modules/@supabase/ssr/src/createBrowserClient.ts:109-115`

shouldUseSingleton = options?.isSingleton === true || ((!options || !("isSingleton" in options)) && isBrowser()); if (shouldUseSingleton && cachedBrowserClient) return cachedBrowserClient;

```
  // singleton client is created only if isSingleton is set to true, or if isSingleton is not defined and we detect a browser
  const shouldUseSingleton =
    options?.isSingleton === true ||
    ((!options || !("isSingleton" in options)) && isBrowser());

  if (shouldUseSingleton && cachedBrowserClient) {
    return cachedBrowserClient;
```

#### Validation

DeptHeader instantiates useTenantClient even for signed-out department front doors. Both tenant and control browser factories call createBrowserClient without isSingleton:false. Installed @supabase/ssr caches one module-global browser client and returns it before inspecting later URL/key/cookie arguments. Next Link navigation retains that module instance while changing rendered branding and forms. DeptLoginForm.signUp/signInWithPassword and ControlAuthPanel then send the visitor's credentials and, for tenant signup, invite_code metadata to the previously selected project. Counterevidence: Full document navigation resets the singleton; server-side clients are separately constructed and SQL RLS still applies. React useMemo does not fix the issue because the library factory itself ignores subsequent options. Raw plaintext password visibility to the tenant operator was not established.

Validation method: parent source trace and applicable local regression tests

**Entry point and control** — `src/lib/tenant/client.ts:13-20`

return createBrowserClient(opts.supabaseUrl, opts.anonKey, { cookieOptions: tenantCookieConfig(opts.slug) });

```
export function createTenantBrowserClient(opts: {
  slug: string;
  supabaseUrl: string;
  anonKey: string;
}) {
  return createBrowserClient(opts.supabaseUrl, opts.anonKey, {
    cookieOptions: tenantCookieConfig(opts.slug),
  });
```

**Supporting control** — `src/lib/control/browser.ts:12-16`

return createBrowserClient(NEXT_PUBLIC_CONTROL_SUPABASE_URL, NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY);

```
export function createControlBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY!
  );
```

**Supporting control** — `src/components/dept/DeptHeader.tsx:20-22`

const supabase = useTenantClient();

```
  const { t } = useI18n();
  const { branding, href, slug } = useTenant();
  const supabase = useTenantClient();
```

**Supporting control** — `src/components/dept/DeptLoginForm.tsx:107-118`

supabase.auth.signUp({ email, password, options: { ... data: { invite_code: ... } } })

```
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: callback,
            // Read by handle_new_user() out of raw_user_meta_data. Sending it
            // as metadata is what lets the trigger check the code in the same
            // transaction that creates the user.
            data: invite.trim() ? { invite_code: invite.trim().toUpperCase() } : {},
          },
        });
```

**Supporting control** — `src/components/setup/ControlAuthPanel.tsx:47-53`

createControlBrowserClient(); ... signUp(creds) : signInWithPassword(creds)

```
    const supabase = createControlBrowserClient();
    const creds = { email: email.trim(), password };

    const { data, error: authError } =
      mode === "signup"
        ? await supabase.auth.signUp(creds)
        : await supabase.auth.signInWithPassword(creds);
```

**Supporting control** — `node_modules/@supabase/ssr/src/createBrowserClient.ts:109-115`

shouldUseSingleton = options?.isSingleton === true || ((!options || !("isSingleton" in options)) && isBrowser()); if (shouldUseSingleton && cachedBrowserClient) return cachedBrowserClient;

```
  // singleton client is created only if isSingleton is set to true, or if isSingleton is not defined and we detect a browser
  const shouldUseSingleton =
    options?.isSingleton === true ||
    ((!options || !("isSingleton" in options)) && isBrowser());

  if (shouldUseSingleton && cachedBrowserClient) {
    return cachedBrowserClient;
```

Limitations:
- No deployed Supabase service was probed; source evidence describes audited revision ebe4fabb.

#### Dataflow

DeptHeader instantiates useTenantClient even for signed-out department front doors. Both tenant and control browser factories call createBrowserClient without isSingleton:false. Installed @supabase/ssr caches one module-global browser client and returns it before inspecting later URL/key/cookie arguments. Next Link navigation retains that module instance while changing rendered branding and forms. DeptLoginForm.signUp/signInWithPassword and ControlAuthPanel then send the visitor's credentials and, for tenant signup, invite_code metadata to the previously selected project.

- **Source:** Malicious department owner whose department is opened before the visitor navigates within the same application document to another department or platform account form.

- **Sink:** src/lib/tenant/client.ts

- **Outcome:** Credentials, email addresses and invite codes intended for one realm are sent to another project; signup can create an account in an attacker-owned project, exposing stored invite metadata and password hashes there. Browser reads and actions also run against stale project/session state. Do not infer that the Supabase project owner automatically sees plaintext passwords in auth logs.

**Entry point and control** — `src/lib/tenant/client.ts:13-20`

return createBrowserClient(opts.supabaseUrl, opts.anonKey, { cookieOptions: tenantCookieConfig(opts.slug) });

```
export function createTenantBrowserClient(opts: {
  slug: string;
  supabaseUrl: string;
  anonKey: string;
}) {
  return createBrowserClient(opts.supabaseUrl, opts.anonKey, {
    cookieOptions: tenantCookieConfig(opts.slug),
  });
```

**Supporting control** — `src/lib/control/browser.ts:12-16`

return createBrowserClient(NEXT_PUBLIC_CONTROL_SUPABASE_URL, NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY);

```
export function createControlBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY!
  );
```

**Supporting control** — `src/components/dept/DeptHeader.tsx:20-22`

const supabase = useTenantClient();

```
  const { t } = useI18n();
  const { branding, href, slug } = useTenant();
  const supabase = useTenantClient();
```

**Supporting control** — `src/components/dept/DeptLoginForm.tsx:107-118`

supabase.auth.signUp({ email, password, options: { ... data: { invite_code: ... } } })

```
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: callback,
            // Read by handle_new_user() out of raw_user_meta_data. Sending it
            // as metadata is what lets the trigger check the code in the same
            // transaction that creates the user.
            data: invite.trim() ? { invite_code: invite.trim().toUpperCase() } : {},
          },
        });
```

**Supporting control** — `src/components/setup/ControlAuthPanel.tsx:47-53`

createControlBrowserClient(); ... signUp(creds) : signInWithPassword(creds)

```
    const supabase = createControlBrowserClient();
    const creds = { email: email.trim(), password };

    const { data, error: authError } =
      mode === "signup"
        ? await supabase.auth.signUp(creds)
        : await supabase.auth.signInWithPassword(creds);
```

**Supporting control** — `node_modules/@supabase/ssr/src/createBrowserClient.ts:109-115`

shouldUseSingleton = options?.isSingleton === true || ((!options || !("isSingleton" in options)) && isBrowser()); if (shouldUseSingleton && cachedBrowserClient) return cachedBrowserClient;

```
  // singleton client is created only if isSingleton is set to true, or if isSingleton is not defined and we detect a browser
  const shouldUseSingleton =
    options?.isSingleton === true ||
    ((!options || !("isSingleton" in options)) && isBrowser());

  if (shouldUseSingleton && cachedBrowserClient) {
    return cachedBrowserClient;
```

#### Reachability

Malicious department owner whose department is opened before the visitor navigates within the same application document to another department or platform account form.

- **Attacker:** Malicious department owner whose department is opened before the visitor navigates within the same application document to another department or platform account form.

- **Entry point:** src/lib/tenant/client.ts

- **Outcome:** Credentials, email addresses and invite codes intended for one realm are sent to another project; signup can create an account in an attacker-owned project, exposing stored invite metadata and password hashes there. Browser reads and actions also run against stale project/session state. Do not infer that the Supabase project owner automatically sees plaintext passwords in auth logs.

Limitations:
- Full document navigation resets the singleton; server-side clients are separately constructed and SQL RLS still applies. React useMemo does not fix the issue because the library factory itself ignores subsequent options. Raw plaintext password visibility to the tenant operator was not established.

#### Severity

**High** — Malicious department owner whose department is opened before the visitor navigates within the same application document to another department or platform account form. Credentials, email addresses and invite codes intended for one realm are sent to another project; signup can create an account in an attacker-owned project, exposing stored invite metadata and password hashes there. Browser reads and actions also run against stale project/session state. Do not infer that the Supabase project owner automatically sees plaintext passwords in auth logs.

Full document navigation resets the singleton; server-side clients are separately constructed and SQL RLS still applies. React useMemo does not fix the issue because the library factory itself ignores subsequent options. Raw plaintext password visibility to the tenant operator was not established.

#### Remediation

Pass isSingleton:false for every browser factory and maintain separate bounded caches keyed by realm, slug, URL and key, or otherwise maintain one client per validated realm. Verify control-to-tenant and tenant-to-tenant navigation plus signup/invite destination.

Tests:
- Each department and the control plane must use their own Supabase URL, key, cookie namespace and session.

<a id="finding-4"></a>

### [4] Unrestricted file INSERT columns allow forged ranking and moderation counters

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Independently traced against the audited source; local regression failures confirm applicable SQL and browser-client behaviors. |
| Category | data-integrity |
| CWE | CWE-915 |
| Affected lines | db/tenant-schema.sql:223-230, db/tenant-schema.sql:1063-1065, db/tenant-schema.sql:1086-1087, src/components/dept/VaultBrowser.tsx:18-23 |

#### Summary

An ordinary member can manufacture prominent rankings and fabricated engagement/moderation indicators. Seeding view_count to the maximum integer also makes later increment_view operations overflow. Actual view page errors are caught, so this alone does not demonstrate a full page denial of service.

#### Root Cause

files_insert_own checks only owner_id and active membership. Authenticated retains table-wide INSERT while only UPDATE is reduced to descriptive columns. The caller can supply score, upvotes, downvotes, view_count, comment_count, report_count, case_number and created_at in an ordinary PostgREST insert. files_public and VaultBrowser trust and sort these stored values.

**Entry point and control** — `db/tenant-schema.sql:223-230`

Server-maintained counters and case_number are writable columns with defaults.

```
  upvotes        integer not null default 0,
  downvotes      integer not null default 0,
  score          integer not null default 0,
  comment_count  integer not null default 0,
  report_count   integer not null default 0,
  view_count     integer not null default 0,
  case_number    bigserial,
  created_at     timestamptz not null default now()
```

**Supporting control** — `db/tenant-schema.sql:1063-1065`

for insert ... with check (owner_id = auth.uid() and public.is_active_member())

```
drop policy if exists files_insert_own on public.files;
create policy files_insert_own on public.files
  for insert to authenticated with check (owner_id = auth.uid() and public.is_active_member());
```

**Supporting control** — `db/tenant-schema.sql:1086-1087`

revoke update ... grant update(title,description,category); no INSERT column restriction

```
revoke update on public.files from anon, authenticated;
grant  update (title, description, category) on public.files to authenticated;
```

**Supporting control** — `src/components/dept/VaultBrowser.tsx:18-23`

Sorts use score, created_at, view_count and comment_count.

```
const SORTS: Record<SortKey, { column: string; ascending: boolean }> = {
  top: { column: "score", ascending: false },
  new: { column: "created_at", ascending: false },
  worst: { column: "score", ascending: true },
  views: { column: "view_count", ascending: false },
  discussed: { column: "comment_count", ascending: false },
```

#### Validation

files_insert_own checks only owner_id and active membership. Authenticated retains table-wide INSERT while only UPDATE is reduced to descriptive columns. The caller can supply score, upvotes, downvotes, view_count, comment_count, report_count, case_number and created_at in an ordinary PostgREST insert. files_public and VaultBrowser trust and sort these stored values. Counterevidence: Direct UPDATE of counters is correctly denied. Vote/comment/report triggers eventually recalculate some counters when those events occur; an initial forged value can persist until such an event, and view_count increments rather than recomputes.

Validation method: parent source trace and applicable local regression tests

**Entry point and control** — `db/tenant-schema.sql:223-230`

Server-maintained counters and case_number are writable columns with defaults.

```
  upvotes        integer not null default 0,
  downvotes      integer not null default 0,
  score          integer not null default 0,
  comment_count  integer not null default 0,
  report_count   integer not null default 0,
  view_count     integer not null default 0,
  case_number    bigserial,
  created_at     timestamptz not null default now()
```

**Supporting control** — `db/tenant-schema.sql:1063-1065`

for insert ... with check (owner_id = auth.uid() and public.is_active_member())

```
drop policy if exists files_insert_own on public.files;
create policy files_insert_own on public.files
  for insert to authenticated with check (owner_id = auth.uid() and public.is_active_member());
```

**Supporting control** — `db/tenant-schema.sql:1086-1087`

revoke update ... grant update(title,description,category); no INSERT column restriction

```
revoke update on public.files from anon, authenticated;
grant  update (title, description, category) on public.files to authenticated;
```

**Supporting control** — `src/components/dept/VaultBrowser.tsx:18-23`

Sorts use score, created_at, view_count and comment_count.

```
const SORTS: Record<SortKey, { column: string; ascending: boolean }> = {
  top: { column: "score", ascending: false },
  new: { column: "created_at", ascending: false },
  worst: { column: "score", ascending: true },
  views: { column: "view_count", ascending: false },
  discussed: { column: "comment_count", ascending: false },
```

Limitations:
- No deployed Supabase service was probed; source evidence describes audited revision ebe4fabb.

#### Dataflow

files_insert_own checks only owner_id and active membership. Authenticated retains table-wide INSERT while only UPDATE is reduced to descriptive columns. The caller can supply score, upvotes, downvotes, view_count, comment_count, report_count, case_number and created_at in an ordinary PostgREST insert. files_public and VaultBrowser trust and sort these stored values.

- **Source:** Any active tenant member.

- **Sink:** db/tenant-schema.sql

- **Outcome:** An ordinary member can manufacture prominent rankings and fabricated engagement/moderation indicators. Seeding view_count to the maximum integer also makes later increment_view operations overflow. Actual view page errors are caught, so this alone does not demonstrate a full page denial of service.

**Entry point and control** — `db/tenant-schema.sql:223-230`

Server-maintained counters and case_number are writable columns with defaults.

```
  upvotes        integer not null default 0,
  downvotes      integer not null default 0,
  score          integer not null default 0,
  comment_count  integer not null default 0,
  report_count   integer not null default 0,
  view_count     integer not null default 0,
  case_number    bigserial,
  created_at     timestamptz not null default now()
```

**Supporting control** — `db/tenant-schema.sql:1063-1065`

for insert ... with check (owner_id = auth.uid() and public.is_active_member())

```
drop policy if exists files_insert_own on public.files;
create policy files_insert_own on public.files
  for insert to authenticated with check (owner_id = auth.uid() and public.is_active_member());
```

**Supporting control** — `db/tenant-schema.sql:1086-1087`

revoke update ... grant update(title,description,category); no INSERT column restriction

```
revoke update on public.files from anon, authenticated;
grant  update (title, description, category) on public.files to authenticated;
```

**Supporting control** — `src/components/dept/VaultBrowser.tsx:18-23`

Sorts use score, created_at, view_count and comment_count.

```
const SORTS: Record<SortKey, { column: string; ascending: boolean }> = {
  top: { column: "score", ascending: false },
  new: { column: "created_at", ascending: false },
  worst: { column: "score", ascending: true },
  views: { column: "view_count", ascending: false },
  discussed: { column: "comment_count", ascending: false },
```

#### Reachability

Any active tenant member.

- **Attacker:** Any active tenant member.

- **Entry point:** db/tenant-schema.sql

- **Outcome:** An ordinary member can manufacture prominent rankings and fabricated engagement/moderation indicators. Seeding view_count to the maximum integer also makes later increment_view operations overflow. Actual view page errors are caught, so this alone does not demonstrate a full page denial of service.

Limitations:
- Direct UPDATE of counters is correctly denied. Vote/comment/report triggers eventually recalculate some counters when those events occur; an initial forged value can persist until such an event, and view_count increments rather than recomputes.

#### Severity

**Medium** — Any active tenant member. An ordinary member can manufacture prominent rankings and fabricated engagement/moderation indicators. Seeding view_count to the maximum integer also makes later increment_view operations overflow. Actual view page errors are caught, so this alone does not demonstrate a full page denial of service.

Direct UPDATE of counters is correctly denied. Vote/comment/report triggers eventually recalculate some counters when those events occur; an initial forged value can persist until such an event, and view_count increments rather than recomputes.

#### Remediation

Revoke blanket INSERT and grant only uploader-supplied columns, or force protected defaults in a trusted insert function/trigger. Apply the same principle to reports.status, resolved_by and timestamps, which currently are also caller-settable on INSERT.

Tests:
- Scores, vote totals, comment/view/report counters, case numbers and creation timestamps must be assigned by trusted database logic.

<a id="finding-5"></a>

### [5] Members can bypass the configured storage quota through direct uploads

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Independently traced against the audited source; local regression failures confirm applicable SQL and browser-client behaviors. |
| Category | resource-exhaustion |
| CWE | CWE-770, CWE-602 |
| Affected lines | db/tenant-schema.sql:553-576, db/tenant-schema.sql:1216-1223, src/components/dept/UploadForm.tsx:131-163, db/tenant-schema.sql:268-271 |

#### Summary

One member can exhaust the tenant's storage allowance or generate costs despite a configured per-member cap, preventing legitimate members from uploading.

#### Root Cause

Storage insert policy allows arbitrary objects inside the caller's folder if the caller is active. The quota trigger only runs when a separate public.files row is inserted. A direct Storage API client can omit that row entirely, or record size_bytes=0, and keep uploading objects. The ordinary browser rollback is optional from the attacker's perspective.

**Entry point and control** — `db/tenant-schema.sql:553-576`

before insert on public.files ... sum(f.size_bytes) ... used + new.size_bytes \> cap_mb

```
create or replace function public.enforce_member_quota()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare cap_mb integer; used bigint;
begin
  select s.max_member_storage_mb into cap_mb from public.settings s where s.id;
  if cap_mb is null then return new; end if;

  select coalesce(sum(f.size_bytes), 0) into used
    from public.files f where f.owner_id = new.owner_id;

  if used + new.size_bytes > cap_mb::bigint * 1024 * 1024 then
    raise exception 'QUOTA_EXCEEDED'
      using hint = 'This account has reached the storage limit for this department.';
  end if;

  return new;
end; $fn$;

revoke execute on function public.enforce_member_quota() from anon, authenticated, public;

drop trigger if exists files_quota_check on public.files;
create trigger files_quota_check
  before insert on public.files
  for each row execute function public.enforce_member_quota();
```

**Supporting control** — `db/tenant-schema.sql:1216-1223`

Storage insert check only bucket_id, foldername(name)\[1\] = auth.uid(), is_active_member()

```
drop policy if exists "dept upload own folder" on storage.objects;
create policy "dept upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'department-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_member()
  );
```

**Supporting control** — `src/components/dept/UploadForm.tsx:131-163`

Storage upload precedes files.insert; removal after quota failure happens only in client code.

```
    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: row, error: insertError } = await supabase
        .from("files")
        .insert({
          owner_id: userId,
          title: title.trim().slice(0, 200),
          description: description.trim().slice(0, 2000) || null,
          category,
          storage_path: path,
          original_name: file.name.slice(0, 200),
          mime_type: file.type,
          size_bytes: file.size,
          kind: kindFromMime(file.type),
        })
        .select("id")
        .single();

      if (insertError) {
        // Do not leave an orphaned object behind if the row could not be made.
        // This covers the storage quota too: the cap is a trigger on this
        // INSERT, so a refusal arrives here with the object already uploaded,
        // and without this the upload would spend the allowance it was
        // refused for.
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        throw insertError;
```

**Supporting control** — `db/tenant-schema.sql:268-271`

files_size_sane permits size_bytes=0

```
alter table public.files drop constraint if exists files_size_sane;
alter table public.files
  add constraint files_size_sane
  check (size_bytes between 0 and 52428800) not valid;
```

#### Validation

Storage insert policy allows arbitrary objects inside the caller's folder if the caller is active. The quota trigger only runs when a separate public.files row is inserted. A direct Storage API client can omit that row entirely, or record size_bytes=0, and keep uploading objects. The ordinary browser rollback is optional from the attacker's perspective. Counterevidence: The source explicitly describes the cap as bounding the ordinary case and acknowledges that sizes are client claims. Bucket file_size_limit constrains each object, not total usage. Null quota intentionally means unlimited; this finding concerns departments with a configured cap.

Validation method: parent source trace and applicable local regression tests

**Entry point and control** — `db/tenant-schema.sql:553-576`

before insert on public.files ... sum(f.size_bytes) ... used + new.size_bytes \> cap_mb

```
create or replace function public.enforce_member_quota()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare cap_mb integer; used bigint;
begin
  select s.max_member_storage_mb into cap_mb from public.settings s where s.id;
  if cap_mb is null then return new; end if;

  select coalesce(sum(f.size_bytes), 0) into used
    from public.files f where f.owner_id = new.owner_id;

  if used + new.size_bytes > cap_mb::bigint * 1024 * 1024 then
    raise exception 'QUOTA_EXCEEDED'
      using hint = 'This account has reached the storage limit for this department.';
  end if;

  return new;
end; $fn$;

revoke execute on function public.enforce_member_quota() from anon, authenticated, public;

drop trigger if exists files_quota_check on public.files;
create trigger files_quota_check
  before insert on public.files
  for each row execute function public.enforce_member_quota();
```

**Supporting control** — `db/tenant-schema.sql:1216-1223`

Storage insert check only bucket_id, foldername(name)\[1\] = auth.uid(), is_active_member()

```
drop policy if exists "dept upload own folder" on storage.objects;
create policy "dept upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'department-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_member()
  );
```

**Supporting control** — `src/components/dept/UploadForm.tsx:131-163`

Storage upload precedes files.insert; removal after quota failure happens only in client code.

```
    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: row, error: insertError } = await supabase
        .from("files")
        .insert({
          owner_id: userId,
          title: title.trim().slice(0, 200),
          description: description.trim().slice(0, 2000) || null,
          category,
          storage_path: path,
          original_name: file.name.slice(0, 200),
          mime_type: file.type,
          size_bytes: file.size,
          kind: kindFromMime(file.type),
        })
        .select("id")
        .single();

      if (insertError) {
        // Do not leave an orphaned object behind if the row could not be made.
        // This covers the storage quota too: the cap is a trigger on this
        // INSERT, so a refusal arrives here with the object already uploaded,
        // and without this the upload would spend the allowance it was
        // refused for.
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        throw insertError;
```

**Supporting control** — `db/tenant-schema.sql:268-271`

files_size_sane permits size_bytes=0

```
alter table public.files drop constraint if exists files_size_sane;
alter table public.files
  add constraint files_size_sane
  check (size_bytes between 0 and 52428800) not valid;
```

Limitations:
- No deployed Supabase service was probed; source evidence describes audited revision ebe4fabb.
- Hosted Storage enforcement is not reproduced by the SQL shim.

#### Dataflow

Storage insert policy allows arbitrary objects inside the caller's folder if the caller is active. The quota trigger only runs when a separate public.files row is inserted. A direct Storage API client can omit that row entirely, or record size_bytes=0, and keep uploading objects. The ordinary browser rollback is optional from the attacker's perspective.

- **Source:** Any active tenant member, including self-registered members of an open department.

- **Sink:** db/tenant-schema.sql

- **Outcome:** One member can exhaust the tenant's storage allowance or generate costs despite a configured per-member cap, preventing legitimate members from uploading.

**Entry point and control** — `db/tenant-schema.sql:553-576`

before insert on public.files ... sum(f.size_bytes) ... used + new.size_bytes \> cap_mb

```
create or replace function public.enforce_member_quota()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare cap_mb integer; used bigint;
begin
  select s.max_member_storage_mb into cap_mb from public.settings s where s.id;
  if cap_mb is null then return new; end if;

  select coalesce(sum(f.size_bytes), 0) into used
    from public.files f where f.owner_id = new.owner_id;

  if used + new.size_bytes > cap_mb::bigint * 1024 * 1024 then
    raise exception 'QUOTA_EXCEEDED'
      using hint = 'This account has reached the storage limit for this department.';
  end if;

  return new;
end; $fn$;

revoke execute on function public.enforce_member_quota() from anon, authenticated, public;

drop trigger if exists files_quota_check on public.files;
create trigger files_quota_check
  before insert on public.files
  for each row execute function public.enforce_member_quota();
```

**Supporting control** — `db/tenant-schema.sql:1216-1223`

Storage insert check only bucket_id, foldername(name)\[1\] = auth.uid(), is_active_member()

```
drop policy if exists "dept upload own folder" on storage.objects;
create policy "dept upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'department-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_member()
  );
```

**Supporting control** — `src/components/dept/UploadForm.tsx:131-163`

Storage upload precedes files.insert; removal after quota failure happens only in client code.

```
    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: row, error: insertError } = await supabase
        .from("files")
        .insert({
          owner_id: userId,
          title: title.trim().slice(0, 200),
          description: description.trim().slice(0, 2000) || null,
          category,
          storage_path: path,
          original_name: file.name.slice(0, 200),
          mime_type: file.type,
          size_bytes: file.size,
          kind: kindFromMime(file.type),
        })
        .select("id")
        .single();

      if (insertError) {
        // Do not leave an orphaned object behind if the row could not be made.
        // This covers the storage quota too: the cap is a trigger on this
        // INSERT, so a refusal arrives here with the object already uploaded,
        // and without this the upload would spend the allowance it was
        // refused for.
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        throw insertError;
```

**Supporting control** — `db/tenant-schema.sql:268-271`

files_size_sane permits size_bytes=0

```
alter table public.files drop constraint if exists files_size_sane;
alter table public.files
  add constraint files_size_sane
  check (size_bytes between 0 and 52428800) not valid;
```

#### Reachability

Any active tenant member, including self-registered members of an open department.

- **Attacker:** Any active tenant member, including self-registered members of an open department.

- **Entry point:** db/tenant-schema.sql

- **Outcome:** One member can exhaust the tenant's storage allowance or generate costs despite a configured per-member cap, preventing legitimate members from uploading.

Limitations:
- The source explicitly describes the cap as bounding the ordinary case and acknowledges that sizes are client claims. Bucket file_size_limit constrains each object, not total usage. Null quota intentionally means unlimited; this finding concerns departments with a configured cap.

#### Severity

**Medium** — Any active tenant member, including self-registered members of an open department. One member can exhaust the tenant's storage allowance or generate costs despite a configured per-member cap, preventing legitimate members from uploading.

The source explicitly describes the cap as bounding the ordinary case and acknowledges that sizes are client claims. Bucket file_size_limit constrains each object, not total usage. Null quota intentionally means unlimited; this finding concerns departments with a configured cap.

#### Remediation

Reserve quota atomically before authorizing uploads and reconcile against trusted storage metadata, enforce aggregate usage at the storage allocation boundary, and include orphaned objects. Serialize per-member reservations.

Tests:
- A configured max_member_storage_mb limit should bound actual bytes an individual member can allocate.

<a id="finding-6"></a>

### [6] Deleting an operator profile bypasses department suspension

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Independently traced against the audited source; local regression failures confirm applicable SQL and browser-client behaviors. |
| Category | authorization |
| CWE | CWE-863 |
| Affected lines | db/control-plane.sql:51-54, db/control-plane.sql:212-214, db/control-plane.sql:246-249, db/test/00-shim.sql:86-95 |

#### Summary

The operator clears the platform suspension and suspended_note, then restores the same slug as active using the same account and tenant coordinates.

#### Root Cause

operators_self grants FOR ALL to the owner's own operator row. Deleting that row cascades through departments.operator_id. Foreign-key cascade deletion is not filtered by the departments_delete_own RLS predicate. The same authenticated user can insert their operator row again and call register_department for the now-free slug.

**Entry point and control** — `db/control-plane.sql:51-54`

operator_id uuid not null references public.operators(id) on delete cascade

```
create table if not exists public.departments (
  slug           text primary key
                   check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'),
  operator_id    uuid not null references public.operators(id) on delete cascade,
```

**Supporting control** — `db/control-plane.sql:212-214`

create policy operators_self ... for all to authenticated using (id = auth.uid()) with check (id = auth.uid())

```
drop policy if exists operators_self on public.operators;
create policy operators_self on public.operators
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
```

**Supporting control** — `db/control-plane.sql:246-249`

departments_delete_own ... using (operator_id = auth.uid() and status \<\> 'suspended')

```
drop policy if exists departments_delete_own on public.departments;
create policy departments_delete_own on public.departments
  for delete to authenticated
  using (operator_id = auth.uid() and status <> 'suspended');
```

**Supporting control** — `db/test/00-shim.sql:86-95`

Repository models Supabase default authenticated INSERT/UPDATE/DELETE grants.

```
-- ------------------------------------------------- Supabase default grants
-- Applied to whatever public.* exists now and to anything created later, which
-- is what a real project does.
grant select, insert, update, delete on all tables    in schema public to anon, authenticated;
grant usage,  select                 on all sequences in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
```

#### Validation

operators_self grants FOR ALL to the owner's own operator row. Deleting that row cascades through departments.operator_id. Foreign-key cascade deletion is not filtered by the departments_delete_own RLS predicate. The same authenticated user can insert their operator row again and call register_department for the now-free slug. Counterevidence: Direct deletion or status modification of the suspended department is blocked correctly. The bypass uses its parent operator row; it does not require changing auth.users or possessing a service role key.

Validation method: parent source trace and applicable local regression tests

**Entry point and control** — `db/control-plane.sql:51-54`

operator_id uuid not null references public.operators(id) on delete cascade

```
create table if not exists public.departments (
  slug           text primary key
                   check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'),
  operator_id    uuid not null references public.operators(id) on delete cascade,
```

**Supporting control** — `db/control-plane.sql:212-214`

create policy operators_self ... for all to authenticated using (id = auth.uid()) with check (id = auth.uid())

```
drop policy if exists operators_self on public.operators;
create policy operators_self on public.operators
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
```

**Supporting control** — `db/control-plane.sql:246-249`

departments_delete_own ... using (operator_id = auth.uid() and status \<\> 'suspended')

```
drop policy if exists departments_delete_own on public.departments;
create policy departments_delete_own on public.departments
  for delete to authenticated
  using (operator_id = auth.uid() and status <> 'suspended');
```

**Supporting control** — `db/test/00-shim.sql:86-95`

Repository models Supabase default authenticated INSERT/UPDATE/DELETE grants.

```
-- ------------------------------------------------- Supabase default grants
-- Applied to whatever public.* exists now and to anything created later, which
-- is what a real project does.
grant select, insert, update, delete on all tables    in schema public to anon, authenticated;
grant usage,  select                 on all sequences in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
```

Limitations:
- No deployed Supabase service was probed; source evidence describes audited revision ebe4fabb.

#### Dataflow

operators_self grants FOR ALL to the owner's own operator row. Deleting that row cascades through departments.operator_id. Foreign-key cascade deletion is not filtered by the departments_delete_own RLS predicate. The same authenticated user can insert their operator row again and call register_department for the now-free slug.

- **Source:** Authenticated platform operator whose department has been suspended.

- **Sink:** db/control-plane.sql

- **Outcome:** The operator clears the platform suspension and suspended_note, then restores the same slug as active using the same account and tenant coordinates.

**Entry point and control** — `db/control-plane.sql:51-54`

operator_id uuid not null references public.operators(id) on delete cascade

```
create table if not exists public.departments (
  slug           text primary key
                   check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'),
  operator_id    uuid not null references public.operators(id) on delete cascade,
```

**Supporting control** — `db/control-plane.sql:212-214`

create policy operators_self ... for all to authenticated using (id = auth.uid()) with check (id = auth.uid())

```
drop policy if exists operators_self on public.operators;
create policy operators_self on public.operators
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
```

**Supporting control** — `db/control-plane.sql:246-249`

departments_delete_own ... using (operator_id = auth.uid() and status \<\> 'suspended')

```
drop policy if exists departments_delete_own on public.departments;
create policy departments_delete_own on public.departments
  for delete to authenticated
  using (operator_id = auth.uid() and status <> 'suspended');
```

**Supporting control** — `db/test/00-shim.sql:86-95`

Repository models Supabase default authenticated INSERT/UPDATE/DELETE grants.

```
-- ------------------------------------------------- Supabase default grants
-- Applied to whatever public.* exists now and to anything created later, which
-- is what a real project does.
grant select, insert, update, delete on all tables    in schema public to anon, authenticated;
grant usage,  select                 on all sequences in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
```

#### Reachability

Authenticated platform operator whose department has been suspended.

- **Attacker:** Authenticated platform operator whose department has been suspended.

- **Entry point:** db/control-plane.sql

- **Outcome:** The operator clears the platform suspension and suspended_note, then restores the same slug as active using the same account and tenant coordinates.

Limitations:
- Direct deletion or status modification of the suspended department is blocked correctly. The bypass uses its parent operator row; it does not require changing auth.users or possessing a service role key.

#### Severity

**Medium** — Authenticated platform operator whose department has been suspended. The operator clears the platform suspension and suspended_note, then restores the same slug as active using the same account and tenant coordinates.

Direct deletion or status modification of the suspended department is blocked correctly. The bypass uses its parent operator row; it does not require changing auth.users or possessing a service role key.

#### Remediation

Restrict operator profiles to SELECT and allowed-column UPDATE, revoke direct INSERT/DELETE as appropriate, and retain moderation tombstones independently of deletable account records. Add a suspended-parent-delete regression.

Tests:
- A suspended listing cannot be removed and re-registered by its operator to clear suspension.

<a id="finding-7"></a>

### [7] Targetless reports bypass duplicate protection and bury the moderation queue

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Independently traced against the audited source; local regression failures confirm applicable SQL and browser-client behaviors. |
| Category | resource-exhaustion |
| CWE | CWE-770, CWE-20 |
| Affected lines | db/tenant-schema.sql:321-332, db/tenant-schema.sql:351-352, db/tenant-schema.sql:1131-1133, src/app/d/\[slug\]/admin/page.tsx:55-59 |

#### Summary

A member can fill storage and push legitimate older complaints out of the administrator's visible queue using reports that name no content. Arbitrary client-supplied creation timestamps can make the malicious rows remain first.

#### Root Cause

Both reports.file_id and reports.comment_id are nullable with no exactly-one-target CHECK. The insert policy checks only reporter_id and active membership. The uniqueness index only covers non-null file_id. A caller inserts unlimited rows with both targets NULL, or duplicates reports for a single comment. Administration selects only the newest 200 reports.

**Entry point and control** — `db/tenant-schema.sql:321-332`

file_id uuid references ...; comment_id uuid references ...; both nullable

```
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  file_id      uuid references public.files(id) on delete cascade,
  comment_id   uuid references public.comments(id) on delete cascade,
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  reason       text not null,
  details      text,
  status       text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles(id) on delete set null
);
```

**Supporting control** — `db/tenant-schema.sql:351-352`

unique ... (file_id, reporter_id) where file_id is not null

```
create unique index if not exists reports_one_per_file_idx
  on public.reports (file_id, reporter_id) where file_id is not null;
```

**Supporting control** — `db/tenant-schema.sql:1131-1133`

reports_insert only requires reporter_id=auth.uid() and is_active_member()

```
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and public.is_active_member());
```

**Supporting control** — `src/app/d/\[slug\]/admin/page.tsx:55-59`

reports order(created_at descending).limit(200)

```
    supabase
      .from("reports")
      .select("id, file_id, reporter_id, reason, details, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
```

#### Validation

Both reports.file_id and reports.comment_id are nullable with no exactly-one-target CHECK. The insert policy checks only reporter_id and active membership. The uniqueness index only covers non-null file_id. A caller inserts unlimited rows with both targets NULL, or duplicates reports for a single comment. Administration selects only the newest 200 reports. Counterevidence: File reports are deduplicated, reasons/details are bounded, and nonmembers cannot insert. These controls do not cover NULL targets or duplicate comment targets.

Validation method: parent source trace and applicable local regression tests

**Entry point and control** — `db/tenant-schema.sql:321-332`

file_id uuid references ...; comment_id uuid references ...; both nullable

```
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  file_id      uuid references public.files(id) on delete cascade,
  comment_id   uuid references public.comments(id) on delete cascade,
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  reason       text not null,
  details      text,
  status       text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles(id) on delete set null
);
```

**Supporting control** — `db/tenant-schema.sql:351-352`

unique ... (file_id, reporter_id) where file_id is not null

```
create unique index if not exists reports_one_per_file_idx
  on public.reports (file_id, reporter_id) where file_id is not null;
```

**Supporting control** — `db/tenant-schema.sql:1131-1133`

reports_insert only requires reporter_id=auth.uid() and is_active_member()

```
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and public.is_active_member());
```

**Supporting control** — `src/app/d/\[slug\]/admin/page.tsx:55-59`

reports order(created_at descending).limit(200)

```
    supabase
      .from("reports")
      .select("id, file_id, reporter_id, reason, details, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
```

Limitations:
- No deployed Supabase service was probed; source evidence describes audited revision ebe4fabb.

#### Dataflow

Both reports.file_id and reports.comment_id are nullable with no exactly-one-target CHECK. The insert policy checks only reporter_id and active membership. The uniqueness index only covers non-null file_id. A caller inserts unlimited rows with both targets NULL, or duplicates reports for a single comment. Administration selects only the newest 200 reports.

- **Source:** Any active tenant member.

- **Sink:** db/tenant-schema.sql

- **Outcome:** A member can fill storage and push legitimate older complaints out of the administrator's visible queue using reports that name no content. Arbitrary client-supplied creation timestamps can make the malicious rows remain first.

**Entry point and control** — `db/tenant-schema.sql:321-332`

file_id uuid references ...; comment_id uuid references ...; both nullable

```
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  file_id      uuid references public.files(id) on delete cascade,
  comment_id   uuid references public.comments(id) on delete cascade,
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  reason       text not null,
  details      text,
  status       text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles(id) on delete set null
);
```

**Supporting control** — `db/tenant-schema.sql:351-352`

unique ... (file_id, reporter_id) where file_id is not null

```
create unique index if not exists reports_one_per_file_idx
  on public.reports (file_id, reporter_id) where file_id is not null;
```

**Supporting control** — `db/tenant-schema.sql:1131-1133`

reports_insert only requires reporter_id=auth.uid() and is_active_member()

```
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and public.is_active_member());
```

**Supporting control** — `src/app/d/\[slug\]/admin/page.tsx:55-59`

reports order(created_at descending).limit(200)

```
    supabase
      .from("reports")
      .select("id, file_id, reporter_id, reason, details, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
```

#### Reachability

Any active tenant member.

- **Attacker:** Any active tenant member.

- **Entry point:** db/tenant-schema.sql

- **Outcome:** A member can fill storage and push legitimate older complaints out of the administrator's visible queue using reports that name no content. Arbitrary client-supplied creation timestamps can make the malicious rows remain first.

Limitations:
- File reports are deduplicated, reasons/details are bounded, and nonmembers cannot insert. These controls do not cover NULL targets or duplicate comment targets.

#### Severity

**Medium** — Any active tenant member. A member can fill storage and push legitimate older complaints out of the administrator's visible queue using reports that name no content. Arbitrary client-supplied creation timestamps can make the malicious rows remain first.

File reports are deduplicated, reasons/details are bounded, and nonmembers cannot insert. These controls do not cover NULL targets or duplicate comment targets.

#### Remediation

Require exactly one non-null target, add unique protection for comment reports, protect server-managed timestamps/status columns, and use a bounded submission RPC with pagination for administrator access.

Tests:
- Each report must identify exactly one real exhibit or comment, and repeated complaints must not flood moderation.

<a id="finding-8"></a>

### [8] Concurrent registration bypasses the three-department account cap

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Independently traced against the audited source; local regression failures confirm applicable SQL and browser-client behaviors. |
| Category | concurrency |
| CWE | CWE-362, CWE-367 |
| Affected lines | db/control-plane.sql:368-370, db/control-plane.sql:381-401, db/control-plane.sql:405-411 |

#### Summary

A single account reserves more slugs than the intended cap permits, undermining the repository's anti-squatting restriction.

#### Root Cause

register_department separately counts existing operator rows and checks the limit. No operator-row lock or advisory lock spans the count and insert. Concurrent transactions can all observe the same below-limit count and insert different slugs. The slug primary key only prevents duplicate slugs, not excess departments per operator.

**Entry point and control** — `db/control-plane.sql:368-370`

max_departments_per_operator returns 3

```
create or replace function public.max_departments_per_operator()
returns integer language sql immutable set search_path = public
as $fn$ select 3; $fn$;
```

**Supporting control** — `db/control-plane.sql:381-401`

count departments by auth.uid(); check count; independently insert requested slug

```
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;

  select count(*) into owned
    from public.departments d where d.operator_id = auth.uid();
  if owned >= public.max_departments_per_operator() then
    raise exception 'TOO_MANY_DEPARTMENTS';
  end if;

  if not public.slug_available(clean) then raise exception 'SLUG_UNAVAILABLE'; end if;

  -- The constraint on the column would catch this anyway; raising here gives
  -- the wizard the same named error it already knows how to explain, instead
  -- of a check-constraint violation it would have to translate.
  if public.looks_like_secret_key(trim(key)) then
    raise exception 'SECRET_KEY';
  end if;

  insert into public.departments
    (slug, operator_id, supabase_url, anon_key, display_name, tagline, visibility)
  values (clean, auth.uid(), trim(url), trim(key), name, tag,
          case when vis = 'public' then 'public' else 'unlisted' end);
```

**Supporting control** — `db/control-plane.sql:405-411`

unique_violation handler protects slug uniqueness only

```
exception
  -- The check above is advisory: two people can pass it in the same instant
  -- and both reach the INSERT. `slug` is the primary key, so the loser gets a
  -- unique violation -- translated here into the same error the pre-check
  -- raises, so the caller has one case to handle rather than two.
  when unique_violation then
    raise exception 'SLUG_UNAVAILABLE';
```

#### Validation

register_department separately counts existing operator rows and checks the limit. No operator-row lock or advisory lock spans the count and insert. Concurrent transactions can all observe the same below-limit count and insert different slugs. The slug primary key only prevents duplicate slugs, not excess departments per operator. Counterevidence: Sequential requests hit the cap and duplicate-slug races are caught. This finding requires concurrent distinct-slug transactions; it is not proof of unlimited serial registration.

Validation method: parent source trace and applicable local regression tests

**Entry point and control** — `db/control-plane.sql:368-370`

max_departments_per_operator returns 3

```
create or replace function public.max_departments_per_operator()
returns integer language sql immutable set search_path = public
as $fn$ select 3; $fn$;
```

**Supporting control** — `db/control-plane.sql:381-401`

count departments by auth.uid(); check count; independently insert requested slug

```
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;

  select count(*) into owned
    from public.departments d where d.operator_id = auth.uid();
  if owned >= public.max_departments_per_operator() then
    raise exception 'TOO_MANY_DEPARTMENTS';
  end if;

  if not public.slug_available(clean) then raise exception 'SLUG_UNAVAILABLE'; end if;

  -- The constraint on the column would catch this anyway; raising here gives
  -- the wizard the same named error it already knows how to explain, instead
  -- of a check-constraint violation it would have to translate.
  if public.looks_like_secret_key(trim(key)) then
    raise exception 'SECRET_KEY';
  end if;

  insert into public.departments
    (slug, operator_id, supabase_url, anon_key, display_name, tagline, visibility)
  values (clean, auth.uid(), trim(url), trim(key), name, tag,
          case when vis = 'public' then 'public' else 'unlisted' end);
```

**Supporting control** — `db/control-plane.sql:405-411`

unique_violation handler protects slug uniqueness only

```
exception
  -- The check above is advisory: two people can pass it in the same instant
  -- and both reach the INSERT. `slug` is the primary key, so the loser gets a
  -- unique violation -- translated here into the same error the pre-check
  -- raises, so the caller has one case to handle rather than two.
  when unique_violation then
    raise exception 'SLUG_UNAVAILABLE';
```

Limitations:
- No deployed Supabase service was probed; source evidence describes audited revision ebe4fabb.
- Concurrency proof is static; local PostgreSQL WASM uses one backend.

#### Dataflow

register_department separately counts existing operator rows and checks the limit. No operator-row lock or advisory lock spans the count and insert. Concurrent transactions can all observe the same below-limit count and insert different slugs. The slug primary key only prevents duplicate slugs, not excess departments per operator.

- **Source:** Authenticated platform operator sending concurrent registration RPCs for distinct available slugs.

- **Sink:** db/control-plane.sql

- **Outcome:** A single account reserves more slugs than the intended cap permits, undermining the repository's anti-squatting restriction.

**Entry point and control** — `db/control-plane.sql:368-370`

max_departments_per_operator returns 3

```
create or replace function public.max_departments_per_operator()
returns integer language sql immutable set search_path = public
as $fn$ select 3; $fn$;
```

**Supporting control** — `db/control-plane.sql:381-401`

count departments by auth.uid(); check count; independently insert requested slug

```
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;

  select count(*) into owned
    from public.departments d where d.operator_id = auth.uid();
  if owned >= public.max_departments_per_operator() then
    raise exception 'TOO_MANY_DEPARTMENTS';
  end if;

  if not public.slug_available(clean) then raise exception 'SLUG_UNAVAILABLE'; end if;

  -- The constraint on the column would catch this anyway; raising here gives
  -- the wizard the same named error it already knows how to explain, instead
  -- of a check-constraint violation it would have to translate.
  if public.looks_like_secret_key(trim(key)) then
    raise exception 'SECRET_KEY';
  end if;

  insert into public.departments
    (slug, operator_id, supabase_url, anon_key, display_name, tagline, visibility)
  values (clean, auth.uid(), trim(url), trim(key), name, tag,
          case when vis = 'public' then 'public' else 'unlisted' end);
```

**Supporting control** — `db/control-plane.sql:405-411`

unique_violation handler protects slug uniqueness only

```
exception
  -- The check above is advisory: two people can pass it in the same instant
  -- and both reach the INSERT. `slug` is the primary key, so the loser gets a
  -- unique violation -- translated here into the same error the pre-check
  -- raises, so the caller has one case to handle rather than two.
  when unique_violation then
    raise exception 'SLUG_UNAVAILABLE';
```

#### Reachability

Authenticated platform operator sending concurrent registration RPCs for distinct available slugs.

- **Attacker:** Authenticated platform operator sending concurrent registration RPCs for distinct available slugs.

- **Entry point:** db/control-plane.sql

- **Outcome:** A single account reserves more slugs than the intended cap permits, undermining the repository's anti-squatting restriction.

Limitations:
- Sequential requests hit the cap and duplicate-slug races are caught. This finding requires concurrent distinct-slug transactions; it is not proof of unlimited serial registration.

#### Severity

**Medium** — Authenticated platform operator sending concurrent registration RPCs for distinct available slugs. A single account reserves more slugs than the intended cap permits, undermining the repository's anti-squatting restriction.

Sequential requests hit the cap and duplicate-slug races are caught. This finding requires concurrent distinct-slug transactions; it is not proof of unlimited serial registration.

#### Remediation

Lock the caller's operator row before counting and keep the lock through insertion, or use an equivalent per-operator transaction lock. Also inspect report_department's separate count/insert cap for the same concurrency shape.

Tests:
- One operator may register no more than max_departments_per_operator() departments.

<a id="finding-9"></a>

### [9] Backslash redirect targets escape the account login same-origin check

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Independently traced against the audited source; local regression failures confirm applicable SQL and browser-client behaviors. |
| Category | redirect-validation |
| CWE | CWE-601 |
| Affected lines | src/app/account/login/page.tsx:14-17, src/components/account/AccountLoginForm.tsx:17-19, node_modules/next/dist/client/components/app-router.js:69 |

#### Summary

An attacker can send a user to an external phishing destination immediately after a successful login on the trusted site. This is a redirect flaw, not a demonstrated token leak.

#### Root Cause

The next query parameter is accepted when it starts with '/' but not '//'. A value beginning with slash-backslash, such as /\\attacker.example, passes that test. AccountLoginForm passes target to router.push after successful authentication. Next constructs a URL against window.location.href; WHATWG special-URL parsing normalizes backslash as slash, making the target a foreign authority.

**Entry point and control** — `src/app/account/login/page.tsx:14-17`

next && next.startsWith('/') && !next.startsWith('//') ? next : '/account'

```
  // Only same-site paths. An open redirect here would let a crafted link
  // bounce someone off a trusted domain the instant they authenticate.
  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
```

**Supporting control** — `src/components/account/AccountLoginForm.tsx:17-19`

onSignedIn -\> router.push(target)

```
      onSignedIn={() => {
        router.push(target);
        router.refresh();
```

**Supporting control** — `node_modules/next/dist/client/components/app-router.js:69`

url = new URL(addBasePath(href), window.location.href)

```
        url = new URL((0, _addbasepath.addBasePath)(href), window.location.href);
```

#### Validation

The next query parameter is accepted when it starts with '/' but not '//'. A value beginning with slash-backslash, such as /\\attacker.example, passes that test. AccountLoginForm passes target to router.push after successful authentication. Next constructs a URL against window.location.href; WHATWG special-URL parsing normalizes backslash as slash, making the target a foreign authority. Counterevidence: Literal double-slash and javascript: destinations are rejected; tenant callbacks prepend an origin and department prefix. The exploitable path is the platform login target reaching client-side navigation.

Validation method: parent source trace and applicable local regression tests

**Entry point and control** — `src/app/account/login/page.tsx:14-17`

next && next.startsWith('/') && !next.startsWith('//') ? next : '/account'

```
  // Only same-site paths. An open redirect here would let a crafted link
  // bounce someone off a trusted domain the instant they authenticate.
  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
```

**Supporting control** — `src/components/account/AccountLoginForm.tsx:17-19`

onSignedIn -\> router.push(target)

```
      onSignedIn={() => {
        router.push(target);
        router.refresh();
```

**Supporting control** — `node_modules/next/dist/client/components/app-router.js:69`

url = new URL(addBasePath(href), window.location.href)

```
        url = new URL((0, _addbasepath.addBasePath)(href), window.location.href);
```

Limitations:
- No deployed Supabase service was probed; source evidence describes audited revision ebe4fabb.

#### Dataflow

The next query parameter is accepted when it starts with '/' but not '//'. A value beginning with slash-backslash, such as /\\attacker.example, passes that test. AccountLoginForm passes target to router.push after successful authentication. Next constructs a URL against window.location.href; WHATWG special-URL parsing normalizes backslash as slash, making the target a foreign authority.

- **Source:** Remote attacker who sends a crafted platform login link to a victim.

- **Sink:** src/app/account/login/page.tsx

- **Outcome:** An attacker can send a user to an external phishing destination immediately after a successful login on the trusted site. This is a redirect flaw, not a demonstrated token leak.

**Entry point and control** — `src/app/account/login/page.tsx:14-17`

next && next.startsWith('/') && !next.startsWith('//') ? next : '/account'

```
  // Only same-site paths. An open redirect here would let a crafted link
  // bounce someone off a trusted domain the instant they authenticate.
  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
```

**Supporting control** — `src/components/account/AccountLoginForm.tsx:17-19`

onSignedIn -\> router.push(target)

```
      onSignedIn={() => {
        router.push(target);
        router.refresh();
```

**Supporting control** — `node_modules/next/dist/client/components/app-router.js:69`

url = new URL(addBasePath(href), window.location.href)

```
        url = new URL((0, _addbasepath.addBasePath)(href), window.location.href);
```

#### Reachability

Remote attacker who sends a crafted platform login link to a victim.

- **Attacker:** Remote attacker who sends a crafted platform login link to a victim.

- **Entry point:** src/app/account/login/page.tsx

- **Outcome:** An attacker can send a user to an external phishing destination immediately after a successful login on the trusted site. This is a redirect flaw, not a demonstrated token leak.

Limitations:
- Literal double-slash and javascript: destinations are rejected; tenant callbacks prepend an origin and department prefix. The exploitable path is the platform login target reaching client-side navigation.

#### Severity

**Medium** — Remote attacker who sends a crafted platform login link to a victim. An attacker can send a user to an external phishing destination immediately after a successful login on the trusted site. This is a redirect flaw, not a demonstrated token leak.

Literal double-slash and javascript: destinations are rejected; tenant callbacks prepend an origin and department prefix. The exploitable path is the platform login target reaching client-side navigation.

#### Remediation

Reject backslashes/control characters, parse with a trusted base origin, and require exact origin equality before returning a normalized local pathname/search/hash. Add slash-backslash encoded regression cases.

Tests:
- The post-login next destination must remain on the application origin.

<a id="finding-10"></a>

### [10] Direct profile updates bypass banned-member and username validation

| Field | Value |
| --- | --- |
| Severity | low |
| Confidence | high |
| Confidence rationale | Independently traced against the audited source; local regression failures confirm applicable SQL and browser-client behaviors. |
| Category | authorization |
| CWE | CWE-863, CWE-20 |
| Affected lines | db/tenant-schema.sql:657-671, db/tenant-schema.sql:1013-1019, db/tenant-schema.sql:1037-1038 |

#### Summary

A banned user can continue changing the name displayed on their historic files/comments; members can choose overlong, whitespace or confusable names that bypass the intended identity rules. RLS still prevents flag escalation.

#### Root Cause

claim_username checks active membership and the ASCII username pattern. profiles_update_self instead allows the caller's own row without an active-member check. Authenticated is explicitly granted direct username UPDATE and profiles_read permits signed-in reads. The profiles table lacks a matching username format/length CHECK.

**Entry point and control** — `db/tenant-schema.sql:657-671`

claim_username checks is_active_member and ^\[A-Za-z0-9_-\]{3,20}$

```
create or replace function public.claim_username(desired text)
returns text language plpgsql security definer set search_path = public as $fn$
declare clean text := trim(desired);
begin
  -- Every other member RPC checks this. Without it a banned member could go on
  -- renaming themselves -- and the name is the one thing of theirs that the
  -- members who can still read the archive see.
  if not public.is_active_member() then raise exception 'NOT_A_MEMBER'; end if;
  if clean !~ '^[A-Za-z0-9_-]{3,20}$' then raise exception 'USERNAME_INVALID'; end if;
  if exists (select 1 from public.profiles p
              where lower(p.username) = lower(clean) and p.id <> auth.uid()) then
    raise exception 'USERNAME_TAKEN';
  end if;
  update public.profiles set username = clean where id = auth.uid();
  return clean;
```

**Supporting control** — `db/tenant-schema.sql:1013-1019`

profiles_read using(true); profiles_update_self using(id=auth.uid())

```
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
```

**Supporting control** — `db/tenant-schema.sql:1037-1038`

grant update(username) on public.profiles to authenticated

```
revoke update on public.profiles from anon, authenticated;
grant  update (username) on public.profiles to authenticated;
```

#### Validation

claim_username checks active membership and the ASCII username pattern. profiles_update_self instead allows the caller's own row without an active-member check. Authenticated is explicitly granted direct username UPDATE and profiles_read permits signed-in reads. The profiles table lacks a matching username format/length CHECK. Counterevidence: Username uniqueness is enforced case-insensitively and flags cannot be directly updated. This is identity/moderation integrity, not administrator escalation or demonstrated XSS.

Validation method: parent source trace and applicable local regression tests

**Entry point and control** — `db/tenant-schema.sql:657-671`

claim_username checks is_active_member and ^\[A-Za-z0-9_-\]{3,20}$

```
create or replace function public.claim_username(desired text)
returns text language plpgsql security definer set search_path = public as $fn$
declare clean text := trim(desired);
begin
  -- Every other member RPC checks this. Without it a banned member could go on
  -- renaming themselves -- and the name is the one thing of theirs that the
  -- members who can still read the archive see.
  if not public.is_active_member() then raise exception 'NOT_A_MEMBER'; end if;
  if clean !~ '^[A-Za-z0-9_-]{3,20}$' then raise exception 'USERNAME_INVALID'; end if;
  if exists (select 1 from public.profiles p
              where lower(p.username) = lower(clean) and p.id <> auth.uid()) then
    raise exception 'USERNAME_TAKEN';
  end if;
  update public.profiles set username = clean where id = auth.uid();
  return clean;
```

**Supporting control** — `db/tenant-schema.sql:1013-1019`

profiles_read using(true); profiles_update_self using(id=auth.uid())

```
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
```

**Supporting control** — `db/tenant-schema.sql:1037-1038`

grant update(username) on public.profiles to authenticated

```
revoke update on public.profiles from anon, authenticated;
grant  update (username) on public.profiles to authenticated;
```

Limitations:
- No deployed Supabase service was probed; source evidence describes audited revision ebe4fabb.

#### Dataflow

claim_username checks active membership and the ASCII username pattern. profiles_update_self instead allows the caller's own row without an active-member check. Authenticated is explicitly granted direct username UPDATE and profiles_read permits signed-in reads. The profiles table lacks a matching username format/length CHECK.

- **Source:** Banned tenant member with a still-valid session, or any active member choosing a deceptive name.

- **Sink:** db/tenant-schema.sql

- **Outcome:** A banned user can continue changing the name displayed on their historic files/comments; members can choose overlong, whitespace or confusable names that bypass the intended identity rules. RLS still prevents flag escalation.

**Entry point and control** — `db/tenant-schema.sql:657-671`

claim_username checks is_active_member and ^\[A-Za-z0-9_-\]{3,20}$

```
create or replace function public.claim_username(desired text)
returns text language plpgsql security definer set search_path = public as $fn$
declare clean text := trim(desired);
begin
  -- Every other member RPC checks this. Without it a banned member could go on
  -- renaming themselves -- and the name is the one thing of theirs that the
  -- members who can still read the archive see.
  if not public.is_active_member() then raise exception 'NOT_A_MEMBER'; end if;
  if clean !~ '^[A-Za-z0-9_-]{3,20}$' then raise exception 'USERNAME_INVALID'; end if;
  if exists (select 1 from public.profiles p
              where lower(p.username) = lower(clean) and p.id <> auth.uid()) then
    raise exception 'USERNAME_TAKEN';
  end if;
  update public.profiles set username = clean where id = auth.uid();
  return clean;
```

**Supporting control** — `db/tenant-schema.sql:1013-1019`

profiles_read using(true); profiles_update_self using(id=auth.uid())

```
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
```

**Supporting control** — `db/tenant-schema.sql:1037-1038`

grant update(username) on public.profiles to authenticated

```
revoke update on public.profiles from anon, authenticated;
grant  update (username) on public.profiles to authenticated;
```

#### Reachability

Banned tenant member with a still-valid session, or any active member choosing a deceptive name.

- **Attacker:** Banned tenant member with a still-valid session, or any active member choosing a deceptive name.

- **Entry point:** db/tenant-schema.sql

- **Outcome:** A banned user can continue changing the name displayed on their historic files/comments; members can choose overlong, whitespace or confusable names that bypass the intended identity rules. RLS still prevents flag escalation.

Limitations:
- Username uniqueness is enforced case-insensitively and flags cannot be directly updated. This is identity/moderation integrity, not administrator escalation or demonstrated XSS.

#### Severity

**Low** — Banned tenant member with a still-valid session, or any active member choosing a deceptive name. A banned user can continue changing the name displayed on their historic files/comments; members can choose overlong, whitespace or confusable names that bypass the intended identity rules. RLS still prevents flag escalation.

Username uniqueness is enforced case-insensitively and flags cannot be directly updated. This is identity/moderation integrity, not administrator escalation or demonstrated XSS.

#### Remediation

Require active membership in the direct UPDATE policy and add a matching nullable username CHECK, or remove direct username UPDATE and route changes only through claim_username.

Tests:
- Banned members cannot keep changing their displayed identity; usernames must follow claim_username's 3–20 ASCII-character rule.

<a id="finding-11"></a>

### [11] Setup authorization survives replacement of the control-plane account

| Field | Value |
| --- | --- |
| Severity | low |
| Confidence | high |
| Confidence rationale | All six source excerpts match audited HEAD. Parent traced the original callback and token consumers; post-fix tests reject another account, legacy envelopes, and expiry. |
| Category | Session management |
| CWE | CWE-613, CWE-863 |
| Affected lines | src/app/api/setup/oauth/callback/route.ts:65-88, src/app/api/setup/provision/route.ts:59-77, src/app/api/setup/oauth/status/route.ts:18-49, src/app/api/setup/deprovision/route.ts:96-120, src/lib/setup/oauth-session.ts:119-124, src/app/api/setup/provision/route.ts:238-254 |

#### Summary

The OAuth callback binds initial state to a control user but seals only the resulting Management token. Later setup handlers accept that token alongside any authenticated control account. When a different person signs into their own control account in the same browser while the original setup token survives, they can use the previous person's Supabase authorization.

#### Root Cause

The cookie envelope omits originating user ID, purpose and server-checked expiry. Consumers check only that a current control user exists, then decrypt the raw token independently of that identity.

**Callback validates original control account** — `src/app/api/setup/oauth/callback/route.ts:65-88`

The original account is checked, but only exchanged.token is sealed afterward.

```
  if (!state || !expectedState || state !== expectedState) return back("state");
  if (!verifier) return back("expired");

  // The state seals the account id it was issued to. A code arriving in a
  // different session is not this person's to redeem.
  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  const sealedFor = unseal(state)?.split(":")[0];
  if (!user || !sealedFor || sealedFor !== user.id) return back("session");

  const exchanged = await exchangeCode({
    code,
    redirectUri: `${origin}/api/setup/oauth/callback`,
    verifier,
  });
  if (!exchanged.ok) return back("exchange", exchanged.message);

  const response = back();
  // An hour is longer than provisioning takes and shorter than anybody leaves
  // a tab open on purpose. Cleared explicitly when setup finishes.
  response.cookies.set(TOKEN_COOKIE, seal(exchanged.token), {
    ...COOKIE_BASE,
    maxAge: 3600,
```

**Any current control user can use the surviving token** — `src/app/api/setup/provision/route.ts:59-77`

User existence and token decryption are separate; no identity equality is checked.

```
  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  // Creating Supabase projects is the most expensive thing this app can be
  // made to do on somebody else's account, so the ceiling here is much lower
  // than the probe's.
  const byAccount = rateLimit(`provision:${user.id}`, LIMIT, WINDOW_MS);
  const byAddress = rateLimit(`provision-ip:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!byAccount.ok || !byAddress.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) {
    return NextResponse.json({ error: "NOT_CONNECTED" }, { status: 401 });
```

**Organizations disclosed under any current account** — `src/app/api/setup/oauth/status/route.ts:18-49`

The token is decrypted without reference to the authenticated user and used to list organizations.

```
  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  // Said out loud rather than folded into a bare "not connected": it is the
  // difference between "press the button" and "you need an account first", and
  // the wizard cannot tell from the client which one it is looking at.
  if (!user) {
    return NextResponse.json({
      available: true,
      connected: false,
      reason: "not_signed_in",
    });
  }

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) {
    return NextResponse.json({
      available: true,
      connected: false,
      reason: "no_token",
    });
  }

  // A token that no longer works is not a connection. Listing organisations is
  // the cheapest call that proves it, and the wizard needs them anyway.
  //
  // Reporting WHY matters more here than anywhere else in this flow: a token
  // that exchanged perfectly and is then refused by the first call is an
  // OAuth app missing the Organizations scope, and without the status number
  // that is indistinguishable from never having connected at all -- which is
  // what it looked like.
  const orgs = await listOrganizations(token);
```

**Project deletion consumes raw authorization** — `src/app/api/setup/deprovision/route.ts:96-120`

Directory-derived ref is checked, but token authority is not bound to the control account.

```
  const ref = PROJECT_URL.exec(department.supabase_url as string)?.[1];
  if (!ref) {
    // The column's CHECK constraint should make this unreachable. If it ever
    // is reached, the honest answer is "we cannot find the project from here",
    // not a request to the Management API built out of a URL we do not
    // recognise.
    return NextResponse.json({ error: "NOT_SUPABASE" }, { status: 409 });
  }

  const dashboard = `https://supabase.com/dashboard/project/${ref}`;

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) {
    // Recoverable, and the only exit the caller should offer a retry for:
    // connect, then press the button again.
    return NextResponse.json(
      { error: "NOT_CONNECTED", ref, dashboard },
      { status: 401 }
    );
  }

  // Ask before deleting. A 404 here is the ordinary case of a project somebody
  // already removed from their dashboard, and reporting that as a failure
  // sends them back there to look for something that is not there.
  const existing = await getProject(token, ref);
```

**Separate setup cookie lifecycle** — `src/lib/setup/oauth-session.ts:119-124`

The setup cookie has its own path/lifecycle and SameSite=Lax.

```
export const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/setup",
};
```

**Health refusal retains token** — `src/app/api/setup/provision/route.ts:238-254`

Resumable/health refusal exits leave a still-present token for later requests.

```
  if (refused) {
    // The project exists, so the token stays: fixing whatever was refused and
    // pressing the button again carries on with it rather than making a second.
    return NextResponse.json(
      { ...refusal("health", refused.status, refused.message), ref, url: projectUrl, resumable: true },
      { status: 502 }
    );
  }

  if (!ready) {
    // The project exists and will come up on its own. The token is KEPT here,
    // alone among the exits: this is the one outcome the caller can carry on
    // from, by sending the ref back once the project is up. Saying nothing
    // happened would be worse than useless -- they would create a second one.
    return NextResponse.json(
      { error: "STILL_STARTING", ref, url: projectUrl, resumable: true },
      { status: 202 }
```

#### Validation

Followed callback state binding through token serialization and all three consumers; examined account login and cookie lifecycle, token expiry documentation, and own-token counterexample. No runtime replay or browser attacks. Current implementation tests confirm enforced account binding and lifetime.

Validation method: source trace and local cryptographic/session regression

**Callback validates original control account** — `src/app/api/setup/oauth/callback/route.ts:65-88`

The original account is checked, but only exchanged.token is sealed afterward.

```
  if (!state || !expectedState || state !== expectedState) return back("state");
  if (!verifier) return back("expired");

  // The state seals the account id it was issued to. A code arriving in a
  // different session is not this person's to redeem.
  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  const sealedFor = unseal(state)?.split(":")[0];
  if (!user || !sealedFor || sealedFor !== user.id) return back("session");

  const exchanged = await exchangeCode({
    code,
    redirectUri: `${origin}/api/setup/oauth/callback`,
    verifier,
  });
  if (!exchanged.ok) return back("exchange", exchanged.message);

  const response = back();
  // An hour is longer than provisioning takes and shorter than anybody leaves
  // a tab open on purpose. Cleared explicitly when setup finishes.
  response.cookies.set(TOKEN_COOKIE, seal(exchanged.token), {
    ...COOKIE_BASE,
    maxAge: 3600,
```

**Any current control user can use the surviving token** — `src/app/api/setup/provision/route.ts:59-77`

User existence and token decryption are separate; no identity equality is checked.

```
  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  // Creating Supabase projects is the most expensive thing this app can be
  // made to do on somebody else's account, so the ceiling here is much lower
  // than the probe's.
  const byAccount = rateLimit(`provision:${user.id}`, LIMIT, WINDOW_MS);
  const byAddress = rateLimit(`provision-ip:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!byAccount.ok || !byAddress.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) {
    return NextResponse.json({ error: "NOT_CONNECTED" }, { status: 401 });
```

**Organizations disclosed under any current account** — `src/app/api/setup/oauth/status/route.ts:18-49`

The token is decrypted without reference to the authenticated user and used to list organizations.

```
  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  // Said out loud rather than folded into a bare "not connected": it is the
  // difference between "press the button" and "you need an account first", and
  // the wizard cannot tell from the client which one it is looking at.
  if (!user) {
    return NextResponse.json({
      available: true,
      connected: false,
      reason: "not_signed_in",
    });
  }

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) {
    return NextResponse.json({
      available: true,
      connected: false,
      reason: "no_token",
    });
  }

  // A token that no longer works is not a connection. Listing organisations is
  // the cheapest call that proves it, and the wizard needs them anyway.
  //
  // Reporting WHY matters more here than anywhere else in this flow: a token
  // that exchanged perfectly and is then refused by the first call is an
  // OAuth app missing the Organizations scope, and without the status number
  // that is indistinguishable from never having connected at all -- which is
  // what it looked like.
  const orgs = await listOrganizations(token);
```

**Project deletion consumes raw authorization** — `src/app/api/setup/deprovision/route.ts:96-120`

Directory-derived ref is checked, but token authority is not bound to the control account.

```
  const ref = PROJECT_URL.exec(department.supabase_url as string)?.[1];
  if (!ref) {
    // The column's CHECK constraint should make this unreachable. If it ever
    // is reached, the honest answer is "we cannot find the project from here",
    // not a request to the Management API built out of a URL we do not
    // recognise.
    return NextResponse.json({ error: "NOT_SUPABASE" }, { status: 409 });
  }

  const dashboard = `https://supabase.com/dashboard/project/${ref}`;

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) {
    // Recoverable, and the only exit the caller should offer a retry for:
    // connect, then press the button again.
    return NextResponse.json(
      { error: "NOT_CONNECTED", ref, dashboard },
      { status: 401 }
    );
  }

  // Ask before deleting. A 404 here is the ordinary case of a project somebody
  // already removed from their dashboard, and reporting that as a failure
  // sends them back there to look for something that is not there.
  const existing = await getProject(token, ref);
```

**Separate setup cookie lifecycle** — `src/lib/setup/oauth-session.ts:119-124`

The setup cookie has its own path/lifecycle and SameSite=Lax.

```
export const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/setup",
};
```

**Health refusal retains token** — `src/app/api/setup/provision/route.ts:238-254`

Resumable/health refusal exits leave a still-present token for later requests.

```
  if (refused) {
    // The project exists, so the token stays: fixing whatever was refused and
    // pressing the button again carries on with it rather than making a second.
    return NextResponse.json(
      { ...refusal("health", refused.status, refused.message), ref, url: projectUrl, resumable: true },
      { status: 502 }
    );
  }

  if (!ready) {
    // The project exists and will come up on its own. The token is KEPT here,
    // alone among the exits: this is the one outcome the caller can carry on
    // from, by sending the ref back once the project is up. Saying nothing
    // happened would be worse than useless -- they would create a second one.
    return NextResponse.json(
      { error: "STILL_STARTING", ref, url: projectUrl, resumable: true },
      { status: 202 }
```

Limitations:
- No live OAuth or shared-browser replay performed. The finding describes baseline commit ebe4fabb.

#### Dataflow

The cookie envelope omits originating user ID, purpose and server-checked expiry. Consumers check only that a current control user exists, then decrypt the raw token independently of that identity.

- **Source:** A separate valid control-plane account and access to the same browser profile after the previous operator changes/clears their control account, while the /api/setup token cookie remains valid. No prior authority over the original operator's Supabase organization is assumed.

- **Sink:** Supabase Management API consumers in setup routes

- **Outcome:** Use of the previous operator's Management API authorization: organization names, project creation, arbitrary database changes to a known project accessible to that token, and potentially project deletion after creating an owned directory reference.

**Callback validates original control account** — `src/app/api/setup/oauth/callback/route.ts:65-88`

The original account is checked, but only exchanged.token is sealed afterward.

```
  if (!state || !expectedState || state !== expectedState) return back("state");
  if (!verifier) return back("expired");

  // The state seals the account id it was issued to. A code arriving in a
  // different session is not this person's to redeem.
  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  const sealedFor = unseal(state)?.split(":")[0];
  if (!user || !sealedFor || sealedFor !== user.id) return back("session");

  const exchanged = await exchangeCode({
    code,
    redirectUri: `${origin}/api/setup/oauth/callback`,
    verifier,
  });
  if (!exchanged.ok) return back("exchange", exchanged.message);

  const response = back();
  // An hour is longer than provisioning takes and shorter than anybody leaves
  // a tab open on purpose. Cleared explicitly when setup finishes.
  response.cookies.set(TOKEN_COOKIE, seal(exchanged.token), {
    ...COOKIE_BASE,
    maxAge: 3600,
```

**Any current control user can use the surviving token** — `src/app/api/setup/provision/route.ts:59-77`

User existence and token decryption are separate; no identity equality is checked.

```
  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  // Creating Supabase projects is the most expensive thing this app can be
  // made to do on somebody else's account, so the ceiling here is much lower
  // than the probe's.
  const byAccount = rateLimit(`provision:${user.id}`, LIMIT, WINDOW_MS);
  const byAddress = rateLimit(`provision-ip:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!byAccount.ok || !byAddress.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) {
    return NextResponse.json({ error: "NOT_CONNECTED" }, { status: 401 });
```

**Organizations disclosed under any current account** — `src/app/api/setup/oauth/status/route.ts:18-49`

The token is decrypted without reference to the authenticated user and used to list organizations.

```
  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  // Said out loud rather than folded into a bare "not connected": it is the
  // difference between "press the button" and "you need an account first", and
  // the wizard cannot tell from the client which one it is looking at.
  if (!user) {
    return NextResponse.json({
      available: true,
      connected: false,
      reason: "not_signed_in",
    });
  }

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) {
    return NextResponse.json({
      available: true,
      connected: false,
      reason: "no_token",
    });
  }

  // A token that no longer works is not a connection. Listing organisations is
  // the cheapest call that proves it, and the wizard needs them anyway.
  //
  // Reporting WHY matters more here than anywhere else in this flow: a token
  // that exchanged perfectly and is then refused by the first call is an
  // OAuth app missing the Organizations scope, and without the status number
  // that is indistinguishable from never having connected at all -- which is
  // what it looked like.
  const orgs = await listOrganizations(token);
```

**Project deletion consumes raw authorization** — `src/app/api/setup/deprovision/route.ts:96-120`

Directory-derived ref is checked, but token authority is not bound to the control account.

```
  const ref = PROJECT_URL.exec(department.supabase_url as string)?.[1];
  if (!ref) {
    // The column's CHECK constraint should make this unreachable. If it ever
    // is reached, the honest answer is "we cannot find the project from here",
    // not a request to the Management API built out of a URL we do not
    // recognise.
    return NextResponse.json({ error: "NOT_SUPABASE" }, { status: 409 });
  }

  const dashboard = `https://supabase.com/dashboard/project/${ref}`;

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) {
    // Recoverable, and the only exit the caller should offer a retry for:
    // connect, then press the button again.
    return NextResponse.json(
      { error: "NOT_CONNECTED", ref, dashboard },
      { status: 401 }
    );
  }

  // Ask before deleting. A 404 here is the ordinary case of a project somebody
  // already removed from their dashboard, and reporting that as a failure
  // sends them back there to look for something that is not there.
  const existing = await getProject(token, ref);
```

**Separate setup cookie lifecycle** — `src/lib/setup/oauth-session.ts:119-124`

The setup cookie has its own path/lifecycle and SameSite=Lax.

```
export const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/setup",
};
```

**Health refusal retains token** — `src/app/api/setup/provision/route.ts:238-254`

Resumable/health refusal exits leave a still-present token for later requests.

```
  if (refused) {
    // The project exists, so the token stays: fixing whatever was refused and
    // pressing the button again carries on with it rather than making a second.
    return NextResponse.json(
      { ...refusal("health", refused.status, refused.message), ref, url: projectUrl, resumable: true },
      { status: 502 }
    );
  }

  if (!ready) {
    // The project exists and will come up on its own. The token is KEPT here,
    // alone among the exits: this is the one outcome the caller can carry on
    // from, by sending the ref back once the project is up. Saying nothing
    // happened would be worse than useless -- they would create a second one.
    return NextResponse.json(
      { error: "STILL_STARTING", ref, url: projectUrl, resumable: true },
      { status: 202 }
```

#### Reachability

OAuth setup is configured and the previous operator authorized it. The token remains because setup is unfinished, resumes, encounters one of the non-clearing early exits, or was acquired for deletion before use. The different account uses the same browser cookie jar before external access-token expiry. This is a shared-browser/account-switch condition, not an established remote session-stealing path.

- **Attacker:** A separate valid control-plane account and access to the same browser profile after the previous operator changes/clears their control account, while the /api/setup token cookie remains valid. No prior authority over the original operator's Supabase organization is assumed.

- **Entry point:** /api/setup/oauth/status, /api/setup/provision, /api/setup/deprovision

- **Outcome:** Use of the previous operator's Management API authorization: organization names, project creation, arbitrary database changes to a known project accessible to that token, and potentially project deletion after creating an owned directory reference.

Limitations:
- PKCE and state validation correctly prevent a callback from being completed under a different current account. The defect occurs only after that validation.
- AES-GCM and httpOnly protect token modification and ordinary script reading; they do not bind later use to the authorizing account.
- Without a surviving token cookie, logging into a separate control account grants no Supabase Management access.
- A caller executing SQL with their own Management token already owns that authority; it is not classified as a vulnerability.
- A person retaining an already-authenticated victim browser session already has authority; this finding specifically requires replacement/clearance of the original control identity with a separate account while the independent setup cookie remains. No public remote exploit is claimed.

#### Severity

**Low** — Medium reflects potentially broad external-account consequences but a narrow local/shared-browser account-switch prerequisite and limited token lifetime. It must not be described as unauthenticated remote arbitrary SQL. Calibrated to low for the required shared browser profile and surviving short-lived authorization; no remote exposure path was established.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Seal a purpose-scoped token envelope containing the authenticated control user ID and absolute expiry; reject old, malformed, wrong-user or expired envelopes in status/provision/deprovision. Clear setup authorization on logout/account transitions and terminal workflow exits. The parent has independently started this hardening; this finding describes the immutable baseline.

Tests:
- Reject tokens from a different current control account, tampered or legacy envelopes, and expired authorization; accept an unexpired envelope for its issuing account.

## Structural Hardening

The scan also produced derived, unsealed design guidance based on the complete finding collection. These proposals describe options and tradeoffs; they do not indicate that any finding has been remediated.

[Open the structural hardening portfolio](hardening/hardening.md)

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Independent repository baseline | not recorded | Reported | Reviewed 49 source/configuration files. Parent validation accepted 10 source-backed findings; original candidates, counterevidence, and immutable excerpts retained. Local SQL and browser isolation tests reproduced applicable failures. |
| Setup authorization and founder lifecycle | not recorded | Reported | Independent focused review of 19 files. Bootstrap finding corroborates existing unclaimed-department-takeover and is merged by common control/remediation. OAuth account binding accepted as low severity due to shared-browser prerequisites. No remote arbitrary-SQL issue: own-token authority is intentional. |
| All application components and remaining source | not recorded | No issue found | Supplemental source audit completed all 40 React components plus component types, routes, legal/SEO/i18n, configuration, schema generation, scripts and original tests. No additional authorization or XSS finding. UX integrity issues separately fixed: uncertain uploads, orphan race mitigation, readback and error handling. Third-party Ko-fi script remains explicitly trusted. |

## Open Questions And Follow Up

- No hosted Supabase test credentials are configured. GoTrue signup metadata, email confirmations, Storage byte APIs, live OAuth, and concurrent multi-backend locking remain integration checks.
  - Follow-up prompt: Run the audit's disposable-project integration checklist using explicitly authorized test credentials.
- Does production sanitize forwarded Host/Proto/IP headers and avoid overlapping STATIC_DEPARTMENTS with registered/suspended slugs?
  - Follow-up prompt: Verify deployment proxy configuration and pin inventory; process-local throttles and cache do not enforce global abuse limits.
- Storage metadata accounting remains bypassable by direct uploads and client-reported sizes. Tactical fixes do not close storage-quota-bypass.
  - Follow-up prompt: Review the source-backed storage hardening proposal and validate a tenant-owned admission path with actual Storage semantics.
- Independent baseline candidate awaiting parent validation
  - Follow-up prompt: Review deferred unit tenant-anonymous-delete and close its stated proof gap.
- Independent baseline candidate awaiting parent validation
  - Follow-up prompt: Review deferred unit browser-realm-singleton and close its stated proof gap.
